"use strict"

module.exports = function(app, options){
	const express 	= require('express');
	const util 			= require('util');
	const url 			= require('url');
  const jwt 			= require('jsonwebtoken');
  const _         = require("lodash");

	const logger 		= require('../logger');

	let router 		= express.Router();
	let dbs 			= app.locals.dbs;


  router.post("/token", function(req, res, next){
		let userType 					= req.body.user_type || 'user'; //Two types supported: admin or user
    let account           = res.locals.account;
    let accountName       = account.name;
    let accessTokenSecret = account.accessToken.secret;
    let accessTokenExpiresIn  = account.accessToken.expiresIn;
    let accessTokenAlgorithm = account.accessToken.algorithm;
    let refreshTokenSecret    = account.refreshToken.secret;
    let refreshTokenExpiresIn = account.refreshToken.expiresIn;
    let refreshTokenAlgorithm = account.refreshToken.algorithm;

    //THe POST request put all parameters by x-www-form-urlencoded
    switch(req.body.grant_type){
      case "code":
        var authCode 		= req.body.code
          ,clientId 		= req.body.client_id
          ,clientSecret = req.body.client_secret;

        return res.status(501).json({
            success: false,
            errCode: 501,
            errMsg: "auth_type_not_implemented_yet"
        });

        break;
      case "password":
        //TODO: validate the request is from a trusted client's
        var username = req.body.username
          ,password = req.body.password;

				//validate username and password
				dbs.connect(accountName, function(err, db){
					if(err){
						logger.error(err);
						return res.status(500).json({
							success: false,
							errCode: 500,
							errMsg: err.messag,
							internalError: err
						});
					}
					db.model('User').getAuthenticated(username, password, function(err, user, reason){
								if(err){
									logger.error(err);
									return res.status(403).json({
										success: false,
										errCode: 403,
										errMsg: err.message
									});
								}

								if(user !== null){ //success
									//Generate JWT token
									var claims = {
										sub: user.username,
										staff: user.staff,
										ut: "user",
										iat: _.now(),
										exp: _.now() + accessTokenExpiresIn * 1000,
										iss: req.get('host'),
										scope: user.authorized
									};
									var accessToken = jwt.sign(claims, accessTokenSecret
																	,{
																			algorithms: [ accessTokenAlgorithm ]
																			,expiresIn: accessTokenExpiresIn
																	});

									//Set refresh expires_in
									claims.exp = _.now() + refreshTokenExpiresIn * 1000;

									var refreshToken = jwt.sign(claims, refreshTokenSecret
																	,{
																			algorithms: [ refreshTokenAlgorithm ]
																			,expiresIn: refreshTokenExpiresIn
																	});
									return res.json({
										success: true
										,access_token: accessToken
										,refresh_token: refreshToken
									});
								}else{
									return res.json({
										success: false,
										errCode: '401',
										errMsg: 'authentication_failed'
									});
								}
							});
				});
        break;
      case 'client_credential':
        var clientId     = req.body.client_id
          , clientSecret = req.body.client_secret;

        dbs.connect(accountName, function(err, db){
          if(err){
            logger.error(err);
            return res.status(500).json({
              success: false,
              errCode: 500,
              errMsg: err.messag,
              internalError: err
            });
          }
          db.model('Client')
            .findById(clientId, function(err, client){
              if(err){
                logger.error(err);
                return res.status(500).json({
                  success: false,
                  errCode: 500,
                  errMsg: err.messag,
                  internalError: err
                });
              }

              if(!client){
                return res.status(401).json({
                  success: false,
                  errCode: 401,
                  errMsg: "invalid_client_credential"
                });
              }

              client.compareClientSecrect(clientSecret, function(err, isMatched){
                if(isMatched === true){
                  //Generate accessToken and refreshToken
                  logger.debug(_.now(), _.now() + accessTokenExpiresIn * 1000);

                  var claims = {
                    sub: client.name,
                    id: client._id,
										ut: 'client',
										scope: client.scope,
                    iss: req.get('host'),
										exp: _.now() + accessTokenExpiresIn * 1000
                  };
                  var accessToken = jwt.sign(claims, accessTokenSecret
                                  ,{
                                      algorithms: [ accessTokenAlgorithm ]
                                      ,expiresIn: accessTokenExpiresIn
                                  });
									//Set refresh expires_in
									claims.exp = _.now() + refreshTokenExpiresIn * 1000;
                  var refreshToken = jwt.sign(claims, refreshTokenSecret
                                  ,{
                                      algorithms: [ refreshTokenAlgorithm ]
                                      ,expiresIn: refreshTokenExpiresIn
                                  });
                  return res.json({
                    success: true
                    ,access_token: accessToken
                    ,refresh_token: refreshToken
                  });
                }else{
                  res.status(401).json({
                    success: false,
                    errCode: 401,
                    errMsg: 'invalid_client_credential'
                  });
                }
              })
            });
        });

        break;
			case 'refresh_token':
				//Refresh token logic
				var refreshToken = req.body.refresh_token;
				if(!refreshToken){
					return res.status(403).json({
						success: false,
						errCode: 403,
						errMsg: "invalid_refresh_token"
					});
				}else{

					return jwt.verify(refreshToken, refreshTokenSecret
	            , { algorithms: [ refreshTokenAlgorithm ] }
	            , function(err, token){
									if(err){
										logger.error(err);
										return res.status(403).json({
											success: false,
											errCode: 403,
											errMsg: "invalid_refresh_token"
										});
									}

									if(token.ut === 'client'){
										var clientId = token.client;
										dbs.connect(accountName, function(err, db){
						          if(err){
						            logger.error(err);
						            return res.status(500).json({
						              success: false,
						              errCode: 500,
						              errMsg: err.messag,
						              internalError: err
						            });
						          }
						          db.model('Client')
						            .findById(clientId, function(err, client){
						              if(err){
						                logger.error(err);
						                return res.status(500).json({
						                  success: false,
						                  errCode: 500,
						                  errMsg: err.messag,
						                  internalError: err
						                });
						              }

						              if(!client){
						                return res.status(401).json({
						                  success: false,
						                  errCode: 401,
						                  errMsg: "invalid_client_credential"
						                });
						              }

													var claims = {
				                    sub: client.name,
														id: client._id,
														ut: 'client',
														scope: client.scope,
				                    iss: req.get('host')
				                  };
				                  var accessToken = jwt.sign(claims, accessTokenSecret
				                                  ,{
				                                      algorithms: [ accessTokenAlgorithm ]
				                                      ,expiresIn: accessTokenExpiresIn
				                                  });
													//Set refresh expires_in
				                  var refreshToken = jwt.sign(claims, refreshTokenSecret
				                                  ,{
				                                      algorithms: [ refreshTokenAlgorithm ]
				                                      ,expiresIn: refreshTokenExpiresIn
				                                  });
				                  return res.json({
				                    success: true
				                    ,access_token: accessToken
				                    ,refresh_token: refreshToken
				                  });
						            });
						        });
									}else{
										//User type is user
										var username = token.sub;
										dbs.connect(accountName, function(err, db){
											if(err){
												logger.error(err);
												return res.status(500).json({
													success: false,
													errCode: 500,
													errMsg: err.message,
													internalError: err
												});
											}

											db.model('User')
												.findOne({ username: username })
												.then(function(instance){
													if(!instance || !instance.isValid ){
														return res.status(403).json({
															success: false,
															errCode: 403,
															errMsg: "invalid_refresh_token"
														});
													}else{
														//Generate JWT token
														var claims = {
															sub: instance.username,
															staff: instance.staff,
															ut: "user",
															iss: req.get('host')
														};
														var accessToken = jwt.sign(claims, accessTokenSecret
																						,{
																								algorithms: [ accessTokenAlgorithm ]
																								,expiresIn: accessTokenExpiresIn
																						});

														var refreshToken = jwt.sign(claims, refreshTokenSecret
																						,{
																								algorithms: [ refreshTokenAlgorithm ]
																								,expiresIn: refreshTokenExpiresIn
																						});
														return res.json({
															success: true
															,access_token: accessToken
															,refresh_token: refreshToken
														});
													}
												})
												.catch(function(err){
													logger.error(err);
													return res.status(403).json({
														success: false,
														errCode: 403,
														errMsg: "invalid_refresh_token"
													});
												});
										});
									}
							});
				}
				break;
      default:
        return res.json({
          success: false,
          message: "non_supported_grant_type"
        });
    }
  });

	app.use('/oauth2', router);
}
