"use strict"

let _         = require('lodash')
  ,debug      = require('debug')('authub')
  ,bcrypt     = require('bcrypt-as-promised')
  ,validator = require('validator')
  ,SALT_WORK_FACTOR = 10
  ,MAX_LOGIN_ATTEMPTS = 5
  ,LOCK_TIME  = 2 * 60 * 60 * 1000;

let mongoose 	= require('mongoose');
let Schema 		= mongoose.Schema;

let RegisteredUserSchema = new Schema({
	user: { type: Schema.ObjectId, required: true, ref: 'User', index: { unique: true } },
  staff: { type: String, required: true, index: { unique: true } }, //Administration User has no staff id
  /**
   * internal user is the user who is the staff of the organization with valid organization email address
   * external user is the collaborators from outside
   */
  userType: { type: String, enum: [ 'internal', 'external' ], default: 'internal' },
	createdAt : { type: Date, default: Date.now },
	updatedAt : { type: Date },
	deletedAt : { type: Date }
});

module.exports =  mongoose.model('RegisteredUser', RegisteredUserSchema);
