
const _ = require('lodash');
const logger = require('../logger');
const assert = require("assert");
const validator = require('validator');
const template = require('es6-template-strings');
const sendMail = require('../utils/MailSender');
const config = require('../../config');
const Permission = require('./Permission');
const MODEL_USER = 'User';
const MODEL_ACCOUNT = 'Account';
const MODEL_ACCOUNT_ADMINISTRATOR = 'AccountAdministrator';
const MODEL_TWOFACTORVEFICATION = 'TwoFactorVerification';
const contants = require('../Constants');

const authorizeUserMessageTemplate = _.get(config, 'message.authorizeUser',
            "${account}邀请您加入团队，<a href='http://${account}.console.aivics.cn'>登录系统</a>开始使用" )

const registerUserMessageTemplate = _.get(config, 'message.registerUser',
            "您的FASTCCM账号创建成功，请点击链接<a href='http://member.aivics.cn/activate?token=${token}'>激活账号</a>")

/**
 * Authorize user to specific account - Only account admin can do this operation
 *
 * @param  {Object} inputs User authorization request object e.g.
 *          {
 *          	username: 'username',
 *           	account: 'account name authorize to'
 *          }
 * @param  {Object} context
 *         	{
 *             db: 'mongodb connection object',
 *          }
 * @return {Promise}  Promise with updated user object
 */
const authorizeToAccount = (inputs, context) => {
  const db = context.db;
  assert(db, 'DB Connection should not be undefined or null');

  const userModel = db.model(MODEL_USER);
  const accountAdministratorModel = db.model(MODEL_ACCOUNT_ADMINISTRATOR);


  return userModel.findOne({ username: inputs.username })
    .then( user => {
      if(user){
        return user.authorize(inputs.account);
      }else{
        //User doesn't exist, create new user
        throw new Error('User does not exist');
      }
    })
    .then((user, numAffected) => {
      //Compose message and sendMail
      const message = template(authorizeUserMessageTemplate, { account: inputs.account });

      return sendMail('欢迎', message, [ user.email ], null)
        .then( info => {
          return Promise.resolve(user);
        });
    })
    .catch( err => {
      logger.error(err);
      return Promise.reject(err);
    });
}

/**
 * Register a new user authorize to specific account .
 * When success regsitered, send activation code to email or mobile
 * @param  {Object} inputs User object:
 *                  {
 *                  	username: 'Unique user name, usually we use email address as username',
 *                  	email: 'email address',
 *                  	mobile: 'mobile phone number',
 *                  	firstName: 'Firstname of user',
 *                  	lastName: 'Lastname of user',
 *                  	authorized: [ 'accountName' ],
 *                  }
 * @param  {Object} context running context, e.g.
 *                  {
 *                  	db: 'mongodb connection object',
 *                   	account: 'current account'
 *                  }
 * @return {Promise} A promise with value of new created User object
 */
const register = function(inputs, context){
  const db = context.db;
  const account = context.account;  //Optional
  assert(db, 'DB Connection should not be undefined or null');

  const userModel = db.model(MODEL_USER);

  return userModel.findOne({ username: inputs.username })
    .then( user => {
      if(user){
        //Use exists - it is just authorized to another account,
        //We will go through authorize process
        throw new Error("Can not create an existing user");
      }else{
        //User doesn't exist, create new user
        if(inputs.authorized && account && !inputs.authorized.includes(account)){
          inputs.authorized.push(account);
        }

        return userModel.create(inputs);
      }
    })
    .then( user => {
      if(!user) throw new Error("Failed to create user");

      //Send mail activating notification.
      return db.model(MODEL_TWOFACTORVEFICATION)
        .generate(user.email, contants.VTYPE_USER_REGISTRATION)
        .then( instance => {
          const message = template(registerUserMessageTemplate, instance.toJSON());
          return sendMail('FASTCCM账号注册成功', message,
                                    [ user.email ], null);
        })
        .then( info => {
          logger.debug(user);
          return Promise.resolve(user);
        })
        .catch(err => {
          throw new Error("Activating failed due to error: " + err.message, err);
        });
    })
    .catch( err => {
      logger.error(err);
      return Promise.reject(err);
    });
}

/**
 * Register a new user authorize to specific account .
 * When success regsitered, send activation code to email or mobile
 * @param  {Object} inputs User object:
 *                  {
 *                  	identity: 'email or mobile',
 *                  	token: 'activation token',
 *                  	code: 'activation code',
 *                  	password: 'new password set by user'
 *                  }
 * @param  {Object} context running context, e.g.
 *                  {
 *                  	db: 'mongodb connection object',
 *                  }
 * @return {Promise} A promise with value of new created User object
 */
const activate = function(inputs, context){
  const db = context.db;
  assert(db, 'DB Connection should not be undefined or null');

  const tfvModel = db.model(MODEL_TWOFACTORVEFICATION);
  const userModel = db.model(MODEL_USER);

  return tfvModel.validate(inputs.identity, inputs.token, inputs.code,
            contants.VTYPE_USER_REGISTRATION)
            .then( valid => {
              if(valid){
                const filter = validator.isEmail(inputs.identity) ? { email: inputs.identity } : { mobile: inputs.identity };
                return userModel.findOne(filter);
              }else{
                throw new Error('Failed to activate, invalid information provided');
              }
            })
            .then( user => {
              if(!user) throw new Error("User does not exist");

              user.activated = true;
              user.password = inputs.password;
              return user.save();
            })
            .then( (user, numAffected) => {
              if(!user) throw new Error("Failed to update user, no record updated");

              return Promise.resolve(user);
            })
            .catch( err => {
              return Promise.reject(err);
            });
}

module.exports = {
  /* register new user */
  register: register,

  activate: activate,

  /* authorize a user to an account */
  authorizeToAccount: authorizeToAccount,

}
