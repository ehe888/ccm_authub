// Two factor verification

"use strict"


const mongoose 	= require('mongoose');
const Schema 		= mongoose.Schema;

const _ 						= require("lodash");
const bcrypt	 			= require('bcrypt-as-promised'); //A promise version of bcrypt
const randomstring 	= require("randomstring");
const debug					= require('debug')('authub');
const config        = require('../../config');
const logger        = require('../logger');

//-- Delcare Variables --//
const SALT_WORK_FACTOR 	= process.env.SALT_WORK_FACTOR || 10;
const TOKEN_EXPIRES = process.env.FORGOT_PASSWORD_TOKEN_EXPIRES || 1 * 60 * 60; //in seconds
const CODE_LENGTH = process.env.TFV_CODE_LENGTH || 6;
const CODE_CHARSET = process.env.TFW_CODE_CHARSET || '1234567890';

const TwoFactorVerificationSchema = new Schema({
	identity: { type: String, require: true }, //Identity should be email or mobile phone number
  token: { type: String, require: true }, //Token used in email verfication
  code: { type: String , require: true },
  vtype: { type: String, require: true }, //Verfication type: USER REGISTRATION, FORGOT PASSWORD
  expiresAt: { type: Date, default: Date.now },
	createdAt : { type: Date, default: Date.now },
	updatedAt : { type: Date },
	deletedAt : { type: Date }
});


TwoFactorVerificationSchema.statics.generate = function(identity, vtype) {
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
        code: randomstring.generate({ length: CODE_LENGTH, charset: CODE_CHARSET }),
        vtype: vtype,
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


TwoFactorVerificationSchema.statics.validate = function(identity, token, code, vtype){
  return this.findOne({
    identity: identity,
    token: token,
    vtype: vtype,
    code: code,
  })
  .then((instance) => {
    if(!instance){
      throw new Error('Invalid token and code combination');
    }else{
      return instance.remove();
    }
  })
  .then( instance => {
    return Promise.resolve(true);
  })
  .catch(function(err){
    logger.error(err);
    return Promise.reject(false);
  })
}

const TwoFactorVerification = mongoose.model('TwoFactorVerification', TwoFactorVerificationSchema);


module.exports = TwoFactorVerification;
