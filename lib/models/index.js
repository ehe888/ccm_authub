"use strict"

const assert    = require('assert');
const debug    = require('debug')('authub');
const urljoin  = require("url-join");

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

module.exports = function(options){
  const serverUrl = options.server;  // e.g. mongodb://localhost:27017 on default port
  const masterDb = options.masterDB || "authub_master";
  const dbs = {};
  const Account       = require("./Account");
  const Client        = require('./Client');
  const VeriCode      = require('./VeriCode');
  const User          = require('./User');
  const RegisteredUser = require('./RegisteredUser');
  const ForgotPasswordRequest = require('./ForgotPasswordRequest');

  return {
    connectToMaster: function(cb){
      return this.connect(masterDb, cb);
    },

    connect: function(account, cb){
      //为了向下兼容，保留connect方法，但是connect方法返回的连接不再分account返回独立的连接，
      //所有的连接都是返回masterDB的连接。将多数据库整合为一个数据库
      const db = dbs[masterDb];
      if(!db){
        debug("url : ", urljoin(serverUrl, account));

        const conn = mongoose.createConnection(urljoin(serverUrl, account));
        dbs[masterDb] = conn;

        conn.on('error', console.error.bind(console, 'connection error:'));
        conn.once('open', function() {
          // we're connected!
          debug("we are connected to: " + account);
          cb(null, conn);
        });
      }else{
        cb(null, db);
      }
    }
  }
}
