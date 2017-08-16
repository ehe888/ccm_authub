"use strict"


const mongoose 	= require('mongoose');
const Schema 		= mongoose.Schema;

const _ 						= require("lodash");
const bcrypt	 			= require('bcrypt-as-promised'); //A promise version of bcrypt
const randomstring 	= require("randomstring");
const debug					= require('debug')('authub');
const Promise 			= require('bluebird');

//-- Delcare Variables --//
const SALT_WORK_FACTOR 	= process.env.VERICODE_SALT_WORK_FACTOR || 10;
const CODE_LENGTH = process.env.VERICODE_CODE_LENGTH || 4;
const CODE_CHARSET = process.env.VERICODE_CODE_CHARSET || '1234567890';

const VeriCodeSchema = new Schema({
	identity: { type: String, require: true },
	veriCode: { type: String, require: true },
	used: { type: Boolean, require: true, default: false },
  targetUrl: { type: String, require: true },
  expiresAt: { type: Date, default: Date.now },
	createdAt : { type: Date, default: Date.now },
	updatedAt : { type: Date },
	deletedAt : { type: Date }
});


VeriCodeSchema.statics.generate = function(identity, expires, targetUrl, done){
  var veri_code = randomstring.generate({
    length: CODE_LENGTH,
    charset: CODE_CHARSET,
  });

	this.create({
    identity: identity,
    expiresAt: _.now() + expires * 1000,
    targetUrl: targetUrl,
    veriCode: veri_code
  })
  .then(function(instance){
    if(!instance){
      return done(new Error("failed_to_create_code"))
    }
    return done(null, instance.veriCode);
  })
  .catch(function(err){
    console.error(err);
    return done(err);
  });
};


VeriCodeSchema.statics.validate = function(identity, code, done){
  this.findOne({
    identity: identity,
    veriCode: code,
    used: false
  })
  .then(function(instance){
    if(!instance){
      return done(new Error("invalide_code_and_identity"));
    }
    return done(null, randomstring.generate(32), instance.targetUrl);
  })
  .catch(function(err){
    console.error(err);
    return done(err);
  })
}

const VeriCode = mongoose.model('VeriCode', VeriCodeSchema);


module.exports = VeriCode;
