"use strict";

const _         = require('lodash');
const mongoose 	= require('mongoose');
const Schema 		= mongoose.Schema;

const AccountAdministratorSchema = new Schema({
  account: { type: String, index: { unique: true }, required: true },
	username: { type: String, index: { unique: true }, required: true },
  permissions: { type: [String], required: false  },
	createdAt : { type: Date, default: Date.now },
	updatedAt : { type: Date, default: Date.now },
	deletedAt : { type: Date }
});

module.exports = mongoose.model('AccountAdministrator', AccountAdministratorSchema);
