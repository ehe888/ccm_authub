"use strict"

module.exports = function(app, settings){
	const debug 		= require('debug')('authub');
	const express 	= require('express');
	const util 			= require('util');
	const url 			= require('url');
	const validator = require('validator');
	const accountService = require('../services/account');
	const logger 		= require('../logger');

	var router 		= express.Router();
	var dbs 			= app.locals.dbs;


	// router.get("/activate", function(req, res, next){
	// 	var account = req.x_account_config.name;
	// 	//Activate administrator user, get identity from res.locals.vericode_token;
	// 	var vericodeToken = res.locals.vericode_token;
	//
	// 	var identity = vericodeToken.identity;
	// 	if(!identity){
	// 		return res.status(403).json({
	// 			success: false,
	// 			errCode: 403,
	// 			errMsg: "invalid_identity"
	// 		});
	// 	}
	//
	// 	if(validator.isEmail(identity)){
	// 		//It's email verification
	// 		dbs.connectToMaster(function(err, db){
	//       if(err){
	//         logger.error(err);
	//         return res.status(500);
	//       }
	//
	//       db.model('Account')
	//         .findOne({ email: identity })
	//         .then(function(instance){
	// 					if(!instance){
	// 						return res.status(403).json({
	// 							success: false,
	// 							errCode: 403,
	// 							errMsg: "invalid_identity"
	// 						});
	// 					}
	// 					instance.activated = true;
	//
	// 					return instance.save();
	//         })
	// 				.then(function(){
	// 					return res.status(200).json({
	//             success: true
	//           });
	// 				})
	//         .catch(function(err){
	//           logger.error(err);
	//           return res.status(500).json({
	// 						success: false,
	// 						errCode: 500,
	// 						errMsg: err.message
	// 					});
	//         });
	//     });
	// 	}else{
	// 		return res.status(501).json({
	// 			success: false,
	// 			errMsg: "not_supported"
	// 		})
	// 	}
	// });

	/**
	 * Register a new account
	 */
	router.post("/register", function(req, res, next){
		var name        = req.body.name
				,fullname   = req.body.fullname
				,email      = req.body.email        //creator's email
				,mobile     = req.body.mobile       //creator's mobile
				,firstName  = req.body.firstName    //creator's firstName
				,lastName   = req.body.lastName;    //creator's lastName

		dbs.connectToMaster(function(err, db){
			accountService.createNewAccount({
					name: name,
					fullname: fullname,
					username: email,	//Email is the username
					email: email,
					mobile: mobile,
					firstName: firstName,
					lastName: lastName,
					activated: true,	//By Default activate account
				}, { db: db })
			.then( account => {
				return res.status(201).json({
					success: true,
					account: account.toJSON()
				});
			})
			.catch(function(err){
				logger.error(err);
				return res.status(500).json({
					success: false,
					errMsg: err.message
				});
			});
		});
	});

  router.get("/config", function(req, res, next){

    if(req.identity.ut !== 'client'){
      return res.status(403).json({
        success: false,
        errMsg: "invalid_identity_type"
      })
    }

    var accountName = req.query.account;

    dbs.connectToMaster(function(err, db){
      if(err){
        logger.error(err);
        return res.status(500).json({
          success: false,
          errMsg: err.message,
          error: err.errors
        });
      }

      db.model('Account')
        .findOne({ name: accountName })
        .then(function(instance){
          if(!instance){
            return res.status(403).json({
              success: false,
              errCode: 403,
              errMsg: "invalid_account"
            });
          }

          return res.json({
            success: true,
            data: {
              accessToken: instance.accessToken
            }
          });
        })
        .catch(function(err){
          logger.error(err);
          return res.status(500).json({
            success: false,
            errMsg: err.message,
            error: err.errors
          });
        });
    });
  })
	//
  // router.post("/reset_password", function(req, res, next){
	// 	var newPassword = req.body.new_password;
	// 	var oldPassword = req.body.old_password;
	// 	var isAdmin = req.body.isAdmin;
	//
	// 	console.log("request identity:", req.identity);
	//
	// 	var username = req.identity.sub;
	//
	// 	dbs.connectToMaster(function(err, db){
	// 		if(err){
	// 			logger.error(err);
	// 			throw err;
	// 		}
	//
	// 		db.model('Account')
	// 			.resetPassword(username,
	// 					oldPassword, newPassword, isAdmin, function(err, user){
	// 						if(err) throw err;
	//
	// 						return res.status(200).json({
	// 							success: true
	// 						});
	// 					});
	// 	});
	// });

	app.use('/accounts', router);
}
