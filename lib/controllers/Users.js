"use strict"

module.exports = function(app, options){
	const _ 				= require('lodash');
	const express 	= require('express');
	const logger 		= require('../logger');
	const sendMail  = require('../utils/MailSender');
	const template 	= require('es6-template-strings');
	const util 			= require('util');
	const url 			= require('url');
	const validator = require('validator');
	const router 		= express.Router();
	const dbs 			= app.locals.dbs;
  const constants = require('../Constants');
  const userService = require('../services/User');

	const forgotPasswordRequestSubject =
			_.get(options, 'forgotPasswordRequest.subject',
					process.env.X_FORGOT_PASSWORD_REQUEST ||  "重置密码" );

	const forgotPasswordRequestMessageTemplate =
			_.get(options, 'forgotPasswordRequest.message',
				'请点击链接重置密码：${token}')

	/*
			New created users activate their account by setup new password
	 */
	router.get("/activate", function(req, res, next){
		//var account = res.locals.account;
		//Activate user, get identity from res.locals.vericode_token;
		const token 		= req.body.token;
		const identity 	= req.body.identity;
		const code 			= req.body.code;
		const password 	= req.body.password;

		if(!identity){
			return res.status(403).json({
				success: false,
				errCode: 403,
				errMsg: "invalid_identity"
			});
		}

    dbs.connectToMaster((err, db) => {
      if(err) {
        logger.error(err);
        throw new Error("Cannot connec to database");
      }

      db.model('TwoFactorVerification')
        .findOne({ identity: identity, vtype: constants.VTYPE_USER_REGISTRATION })
        .then( instance => {
          return userService.activate({
              identity: identity,
              token: token,
              code: code,
              password: password,
            }, {
              db: db
            })
        })
        .then( user => {
          return res.status(200).json({
            success: true
          });
        })
        .catch( err => {
          logger.error(err);
          return res.status(403).json({
            success: false,
            errMsg: err.message
          });
        });
    });
	});

	router.post("/reset_password", function(req, res, next){
		var newPassword = req.body.new_password;
		var oldPassword = req.body.old_password;
		let account = res.locals.account.name;
		var isAdmin = req.body.isAdmin;// reset password by administrator

		console.log("request identity:", res.locals.token);

		var username = res.locals.token.sub;// reset password by user self
		if (isAdmin) {
			username = req.body.username;
		}

		dbs.connect(account, function(err, db){
			if(err){
				logger.error(err);
				throw err;
			}

			db.model('User')
				.resetPassword(username,
						oldPassword, newPassword, isAdmin, function(err, user){
							if(err) throw err;

							return res.status(200).json({
								success: true
							});
						});
		});
	});

	router.get("/forgot_password", function(req, res, next){
		const email = req.query.email;

		//TODO: Add extra attribute for double check

		dbs.connectToMaster((err, db) => {
			if(err){
				logger.error(err);
				throw err;
			}

			db.model('User')
				.findOne({ email: email })
				.then( user => {
					if(!user){
						throw new Error("invalid_request");
					}else{
						return db.model('ForgotPasswordRequest')
							.generate(email);
					}
				})
				.then( instance => {
					if(instance){
						//Send instance.token to instance.email
						const message = template(forgotPasswordRequestMessageTemplate, {
							token: instance.token
						})
						sendMail(forgotPasswordRequestSubject,
							message, [ instance.identity ], null, (err, info) => {
								if(err){
									logger.error(err);
									return res.status(500).json({
										success: false,
										errMsg: err.message,
									});
								}else{
									return res.status(200).json({
										success: true
									});
								}
							});
					}else{
						throw new Error("failed_to_process_request");
					}
				})
				.catch(err => {
					logger.error(err);
					return res.status(500).json({
						success: false,
						errMsg: err.message
					})
				});
		});
	});

	router.post("/forgot_password", function(req, res, next){
		const email = req.body.email;
		const token = req.body.token;
		const password = req.body.password;

		dbs.connectToMaster(function(err, db){
			if(err){
				logger.error(err);
				throw err;
			}

			db.model('ForgotPasswordRequest')
				.validate(email, token)
				.then( isValid => {
					if(isValid){
						return db.model('User')
							.resetPasswordWhenForgot(email, password);
					}else{
						return Promise.reject(new Error("invalid_identity_token_combination"));
					}
				})
				.then( (savedUser, numAffected) => {

				})
				.catch(err => {
					return res.status(500)
						.json({
							success: false,
							errMsg: err.message
						})
				})
		});
	});

  /**
   * Create an user - need multi factor authentication,
   * 创建新用户时，直接发送激活码到用户的邮箱
   */
  router.post("/", function(req, res, next){

		if(req.identity.ut !== "admin"){
			return res.status(403).json({
				success: false,
				errMsg: "only_admin_allowed_to_create_user"
			})
		}

		const account = res.locals.account.name;

    dbs.connectToMaster(function(err, db){
      if(err){
        logger.error("Cannot open database connection", err);
        return res.status(500).json({
					success: false,
					errMsg: "failed_to_connect_db"
				});
      }

			db.model('User')
				.findOne({ username: req.body.username })
				.then((user) => {
					if(user != null){
						return Promise.resolve(user);
					}else{
						return userService.register(req.body, {
              db: db,
              sendMail: sendMail,
              operator: res.locals.token.sub,
            });
					}
				})
				.then((user) => {
          //Authorize to current account;
          //User already exists or created, Authorize user to the account
          return userService.authorizeToAccount(
                    { account: account, username: user.username },
                    { db: db, sendMail: sendMail });
				})
        .then( user => {
          res.status(201).json({
						success: true,
						data: process.env.NODE_ENV === "development" ? user : []
					});
        })
				.catch(function(err){
					logger.error("create user error: ", err);
					res.status(500).json({
						success: false,
						errMsg: "failed_to_create_user"
					});
				});
    });
  });

	app.use('/users', router);
}
