"use strict";

const _         = require('lodash');
const debug      = require('debug')('authub');
const bcrypt     = require('bcrypt-as-promised');
const randomstring	= require("randomstring");
const shortid    = require("shortid");
const SALT_WORK_FACTOR = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME  = 2 * 60 * 60 * 1000;

const mongoose 	= require('mongoose');
const Schema 		= mongoose.Schema;

const AccountSchema = new Schema({
  name: { type: String, index: { unique: true }, required: true },
  fullname: { type: String }, //E.g. 上海猎户座网络科技有限公司
  /* This is the username who created the account.
    It will be the superuser of this account,
    if the user doesn't exist we will create it
  */
	username: { type: String, required: true, index: { unique: true } }, //super user's username
  password: { type: String, required: false },
  loginAttempts: { type: Number, default: 0 },
  //Account lockout properties
  // http://devsmash.com/blog/implementing-max-login-attempts-with-mongoose
  lockUntil: { type: Date },
  email: { type: String, required: true, index: { unique: true } },
  emailActivated: { type: Boolean, default: false },  //邮箱激活 － 安全等级次低 － 2
  mobile: { type: String, required: false },
  mobileActivated: { type: Boolean, default: false }, //手机激活 - 安全等级最高 － 3
  activated: { type: Boolean, default: false }, //激活 － 安全等级最低 － 1，未激活安全等级为 0
  accessToken: {
		secret: { type: String, required: false },
		expiresIn: { type: Number, required: false, default: 7200 }, //Default age of JWT token is 7200 seconds
		algorithm: { type: String, required: false, default: 'HS256' } //Default algorithm HMAC + SHA256
	},
	refreshToken: {
		secret: { type: String, required: false, default: randomstring.generate(64) },
		expiresIn: { type: Number, required: false, default: 7200 * 12 * 30 }, //Default age of JWT token is 30 days
		algorithm: { type: String, required: false, default: 'HS256' }
	},
  firstName: { type: String },
  lastName: { type: String, required: false },
	createdAt : { type: Date, default: Date.now },
	updatedAt : { type: Date },
	deletedAt : { type: Date }
});


/**
 * We use secureLevel value to control sensitive operation
 * 	0 - Insecure
 * 	1 - Minimum
 * 	2 - Basic
 * 	3 - Normal
 */

AccountSchema.SecureLevels = {
  INSECURE: 0,
  MINIMUM: 1,
  BASIC: 2,
  NORMAL: 3
};

AccountSchema.virtual("secureLevel").get(function(){
  var secureLevel = 0;
  if(this.activated) secureLevel++;
  if(this.emailActivated) secureLevel++;
  if(this.mobileActivated) secureLevel++;
  return secureLevel;
});

AccountSchema.virtual("isValid").get(function(){
  debug("isValid", this.activated, this.isDeleted, this.isLocked);
  return !!( this.activated && !this.isDeleted && !this.isLocked  )
});

AccountSchema.virtual("isDeleted").get(function(){
  debug("deletedAt:", this.deletedAt);
  return !!( !_.isEmpty(this.deletedAt) )
});


AccountSchema.virtual("isLocked").get(function(){
  return !!(this.lockUntil && this.lockUtil > _.now());
});

AccountSchema.pre('save', function(next) {
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

AccountSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password)
      .then(function(isMatch) {
          cb(null, isMatch);
      })
      .catch(function(err){
          return cb(err);
      });
};

const reasons = AccountSchema.failedLogin = {
    INVALID_CREDENTIAL: "invalid_credential",
    MAX_ATTEMPTS: "over_max_attempts_user_locked",
    NOT_ACTIVATED: 'user_account_not_activated_yet'
};

AccountSchema.methods.incLoginAttempts = function(cb){
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

AccountSchema.statics.resetPassword = function(username, oldPassword, newPassword, isAdmin, cb) {
    var searchCondition = { username: username };

    this.findOne(searchCondition, function(err, accountUser){
        if(err) return cb(err);

        if(accountUser === null){
          return cb(new Error(reasons.INVALID_CREDENTIAL));
        }

        if (!accountUser.activated){
          return cb(new Error(reasons.NOT_ACTIVATED));
        }

        if (accountUser.isLocked) {
            // just increment login attempts if account is already locked
            return accountUser.incLoginAttempts(function(err) {
                if (err) return cb(err);
                return cb(new Error(reasons.MAX_ATTEMPTS));
            });
        }

        if (isAdmin) {
          accountUser.password = newPassword;
          accountUser.save(function(err, savedUser, numAffected){
            if(err) return cb(err);
            return cb(null, savedUser);
          })
        } else {
          // test for a matching password
          accountUser.comparePassword(oldPassword, function(err, isMatch) {
              if (err) return cb(err);

              // check if the password was a match
              if (isMatch) {
                  accountUser.password = newPassword;
                  accountUser.save(function(err, savedUser, numAffected){
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

AccountSchema.statics.getAuthenticated = function(username, password, cb) {
    this.findOne({ username: username }, function(err, user){
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
                user.update(updates, function(err) {
                    if (err) return cb(err);
                    return cb(null, user);
                });
            }else{
              // password is incorrect, so increment login attempts before responding
              user.incLoginAttempts(function(err) {
                  if (err) return cb(err);
                  cb(new Error(reasons.INVALID_CREDENTIAL));
              });
            }
        });
    });
}

module.exports = mongoose.model('Account', AccountSchema);
