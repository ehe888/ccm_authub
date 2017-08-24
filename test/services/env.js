//Unit test on Models

const randomstring 	= require("randomstring");
const express = require('express');
const should  = require('chai').should;
const expect  = require('chai').expect;
const dbHost = process.env.MONGO_HOST || 'localhost';

const dbOptions = {
    server: `mongodb://${dbHost}/`,
    masterDb: 'authub_master'
};

const dbs = require('../../lib/models')(dbOptions);


exports.masterAccount = {
  name: 'authub_master',
  username: 'admin',
  password: 'abc123456',
  mobile: '13764211365',
  email: 'lei.he@fastccm.com',
  fullname: "上海希希麦科技有限公司",
  lastName: "何",
  activated: true,
  accessToken: {
    secret: randomstring.generate(32)
  },
  refreshToken: {
    secret: randomstring.generate(64)
  }
};

exports.masterClient = {
  name: "Master Acount Client",
  secret: randomstring.generate(32),
  scope: [ 'register' ]
}

exports.dbs = dbs;
exports.dbOptions = dbOptions;
