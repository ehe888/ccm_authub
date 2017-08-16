"use strict";

const _         = require('lodash');
const debug     = require('debug')('authub');
const bcrypt    = require('bcrypt-as-promised');
const validator = require('validator');
const SALT_WORK_FACTOR = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME  = 2 * 60 * 60 * 1000;

const mongoose 	= require('mongoose');
const Schema 		= mongoose.Schema;

const UserSchema = new Schema({
	username: { type: String, required: true, index: { unique: true } },
  password: { type: String, required: true },
  loginAttempts: { type: Number, default: 0 },
  //User lockout properties
  // http://devsmash.com/blog/implementing-max-login-attempts-with-mongoose
  lockUntil: { type: Date },
  email: { type: String, required: false, index: { required: true, unique: true } },
  mobile: { type: String, required: false, index: { required: true, unique: true }},
  authorized: { type: [String], required: false },
  activated: { type: Boolean, default: false },
  firstName: { type: String },
  lastName: { type: String },
	createdAt : { type: Date, default: Date.now },
	updatedAt : { type: Date },
	deletedAt : { type: Date }
});

UserSchema.virtual("isValid").get(function(){
  return !!( this.activated && !this.isDeleted && !this.isLocked  )
});

UserSchema.virtual("isDeleted").get(function(){
  return !!( !_.isEmpty(this.deletedAt) );
});


UserSchema.virtual("isLocked").get(function(){
  return !!(this.lockUntil && this.lockUtil > _.now());
});

UserSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    return bcrypt.genSalt(SALT_WORK_FACTOR)
      .then(function(salt) {
        // hash the password using our new salt
        return bcrypt.hash(user.password, salt);
      })
      .then(function(hash){
        user.password = hash;
        return next();
      })
      .catch(function(err){
        debug(err);
        return next(err);
      });
});

UserSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt
      .compare(candidatePassword, this.password)
      .then(function(isMatch) {
        cb(null, isMatch);
      })
      .catch(function(err){
        return cb(err);
      });
};

UserSchema.methods.authorize = function(account){
  if(!this.authorized){
    this.authorized = [];
  }

  if(!this.authorized.includes(account)){
    this.authorized.push(account);
  }

  return this.save();
}

UserSchema.methods.unauthorize = function(account){
  if(this.authorized){
    this.authorized.pop(account);
  }
  return this.save();
}

let reasons = UserSchema.failedLogin = {
    INVALID_CREDENTIAL: "invalid_credential",
    MAX_ATTEMPTS: "over_max_attempts_user_locked",
    NOT_ACTIVATED: 'user_account_not_activated_yet'
};

UserSchema.methods.incLoginAttempts = function(cb){
    // if we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.update({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        }, cb);
    }
    // otherwise we're incrementing
    var updates = { $inc: { loginAttempts: 1 } };
    // lock the account if we've reached max attempts and it's not locked already
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + LOCK_TIME };
    }
    return this.update(updates, cb);
}

UserSchema.statics.resetPassword = function(username, oldPassword, newPassword, isAdmin, cb) {
    var searchCondition = { username: username };
    if(validator.isEmail(username)){
      searchCondition = { email: username };
    }
    this.findOne(searchCondition, function(err, user){
        if(err) return cb(err);

        if(user === null){
          return cb(new Error(reasons.INVALID_CREDENTIAL));
        }

        if (!user.activated){
          return cb(new Error(reasons.NOT_ACTIVATED));
        }

        if (user.isLocked) {
            // just increment login attempts if account is already locked
            return user.incLoginAttempts(function(err) {
                if (err) return cb(err);
                return cb(new Error(reasons.MAX_ATTEMPTS));
            });
        }

        if (isAdmin) {
          user.password = newPassword;
          user.save(function(err, savedUser, numAffected){
            if(err) return cb(err);
            return cb(null, savedUser);
          })
        } else {
          // test for a matching password
          user.comparePassword(oldPassword, function(err, isMatch) {
              if (err) return cb(err);

              // check if the password was a match
              if (isMatch) {

                  // reset attempts and lock info
                  // var updates = {
                  //     $set: { password: newPassword }
                  // };
                  // return user.update(updates, function(err) {
                  //     if (err) return cb(err);
                  //     return cb(null, user);
                  // });

                  user.password = newPassword;
                  user.save(function(err, savedUser, numAffected){
                    if(err) return cb(err);
                    return cb(null, savedUser);
                  })
              }else{
                return cb(new Error(reasons.INVALID_CREDENTIAL));
              }
          });
        }

    });
}

UserSchema.statics.getAuthenticated = function(username, password, cb) {
    var searchCondition = { username: username };
    if(validator.isEmail(username)){
      searchCondition = { email: username };
    }

    this.findOne(searchCondition, function(err, user){
        if(err) return cb(err);

        if(user === null){
          return cb(new Error(reasons.INVALID_CREDENTIAL));
        }

        debug("user activated : ", user.activated);

        if (!user.activated){
          return cb(new Error(reasons.NOT_ACTIVATED));
        }

        if (user.isLocked) {
            // just increment login attempts if account is already locked
            return user.incLoginAttempts(function(err) {
                if (err) return cb(err);
                return cb(new Error(reasons.MAX_ATTEMPTS));
            });
        }

        // test for a matching password
        user.comparePassword(password, function(err, isMatch) {
            if (err) return cb(err);

            // check if the password was a match
            if (isMatch) {
                // if there's no lock or failed attempts, just return the user
                if (!user.loginAttempts && !user.lockUntil) return cb(null, user);
                // reset attempts and lock info
                var updates = {
                    $set: { loginAttempts: 0 },
                    $unset: { lockUntil: 1 }
                };
                return user.update(updates, function(err) {
                    if (err) return cb(err);
                    return cb(null, user);
                });
            }

            // password is incorrect, so increment login attempts before responding
            user.incLoginAttempts(function(err) {
                if (err) return cb(err);
                return cb(new Error(reasons.INVALID_CREDENTIAL));
            });
        });
    });
}

module.exports = mongoose.model('User', UserSchema);
