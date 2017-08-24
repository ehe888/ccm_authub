const _ = require('lodash');
const logger = require('../logger');
const assert = require("assert");
const template = require('es6-template-strings');
const randomstring	= require("randomstring");
const config = require('../../config');
const sendMail = require('../utils/MailSender');
const Permission = require('./Permission');
const MODEL_USER = 'User';
const MODEL_ACCOUNT = 'Account';
const MODEL_ACCOUNT_ADMINISTRATOR = 'AccountAdministrator';
const userService = require('./User');

/**
 * Create a new account
 * @param  {Object} inputs  Account information, e.g.
 *                  {
 *                  	name: 'account name - unique identitifcation',
 *                  	fullname: 'account full name',
 *                  	username: 'administrator username',
 *                  	firstName: 'administrator firstname',
 *                  	lastName: 'administrator lastName',
 *                  	email: 'administrator email',
 *                  	mobile: 'administrator mobile',
 *                  }
 * @param  {Object} context Running context
 * @return {Promsie} created account
 */
const createNewAccount = function(inputs, context){
  const db = context.db;
  assert(db, 'DB Connection should not be undefined or null');

  const accountModel = db.model(MODEL_ACCOUNT);
  const userModel = db.model(MODEL_USER);

  return accountModel
    .create(inputs)
    .then( account => {
      if(account){
        //Account created successful, register account super user
        return userModel.findOne({ username: account.username })
          .then( user => {
            if(user){
              //User already exists, do nothing just send email to notify this user
              //that he/she has been authorized to an account
              return Promise.resolve(user);
            }else{
              //Register new user
              return userService.register({
                username: inputs.username,
                password: randomstring.generate(64),
                email: inputs.email,
                mobile: inputs.mobile,
                firstName: inputs.firstName,
                lastName: inputs.lastName,
              }, {
                db: db,
                account: account.name,
              });
            }
          })
          .then(user => {
            //Authorize user to this account
            return userService.authorizeToAccount({ username: user.username, account: account.name }, { db: db});
            
          })
          .then( user => {
            return Promise.resolve(account);
          });
      }else{
        //Failed to create new account
        throw new Error("No new account created");
      }
    })
    .catch( err => {
      logger.error(err);
      return Promise.reject(err);
    })
}

module.exports = {
  createNewAccount: createNewAccount
}
