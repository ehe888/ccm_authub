"use strict"


const mongoose 	= require('mongoose');
const Schema 		= mongoose.Schema;

const _ 						= require("lodash");
const bcrypt	 			= require('bcrypt-as-promised'); //A promise version of bcrypt
const randomstring 	= require("randomstring");
const debug					= require('debug')('authub');

//-- Delcare Variables --//
const SALT_WORK_FACTOR 	= process.env.SALT_WORK_FACTOR || 10;
const TOKEN_EXPIRES = process.env.FORGOT_PASSWORD_TOKEN_EXPIRES || 1 * 60 * 60; //in seconds

const ForgotPasswordRequestSchema = new Schema({
	identity: { type: String, require: true },
  token: { type: String, require: true },
	used: { type: Boolean, require: true, default: false },
  expiresAt: { type: Date, default: Date.now },
	createdAt : { type: Date, default: Date.now },
	updatedAt : { type: Date },
	deletedAt : { type: Date }
});


ForgotPasswordRequestSchema.statics.generate = function(identity) {
  return bcrypt.genSalt(SALT_WORK_FACTOR)
    .then((salt) => {
      // hash the password using our new salt
      return bcrypt.hash(
        randomstring.generate({ length: 32 }), salt);
    })
    .then((hash) => {
      return this.create({
        identity: identity,
        token: hash,
        expiresAt: _.now() + TOKEN_EXPIRES * 1000,
      })
    })
    .then( instance => {
      return Promise.resolve(instance);
    })
    .catch(function(err){
      return Promise.reject(err);
    });
};


ForgotPasswordRequestSchema.statics.validate = function(identity, token){
  return this.findOne({
    identity: identity,
    token: token,
    used: false
  })
  .then((instance) => {
    if(!instance){
      return Promise.reject('invalid_identity_token_combination');
    }else{
      return Promise.resolve(true);
    }
  })
  .catch(function(err){
    return Promise.reject(err);
  })
}

const ForgotPasswordRequest = mongoose.model('ForgotPasswordRequest', ForgotPasswordRequestSchema);


module.exports = ForgotPasswordRequest;
