"use strict"

module.exports = function(app, options){
	var debug 		= require('debug')('authub')
		,nodemailer = require('nodemailer')
    , log4js    = require('log4js')
    , logger    = log4js.getLogger()
		, express 	= require('express')
		, util 			= require('util')
		, url 			= require('url')
    , jwt 			= require('jsonwebtoken')
    , _         = require("lodash");

	let router 		= express.Router();
	let dbs 			= app.locals.dbs;
	let xConfig 		= app.locals.x_config;	//custom app config

	router.post("/sendMail", function(req, res, next){
		let transporter = nodemailer.createTransport({
			service: 'aliyun',
			host:'smtp.mxhichina.com',
			auth: {
				user: 'service@fastccm.com',
				pass: 'Fastccm123'
			}
		})
		let mailOptions = {
			from: 'service@fastccm.com',
			to: req.body.email,
			subject: req.body.subject,
			html: req.body.html
		}
		transporter.sendMail(mailOptions,(error,info)=>{
			if(error){
				return console.log(error)
			}
			console.log(info)
		})
	});

  router.post("/token", function(req, res, next){
    const account           = req.x_account_config;
    const accountName       = account.name;
    const accessTokenSecret = account.accessToken.secret;
    const accessTokenExpiresIn  = account.accessToken.expiresIn;
    const accessTokenAlgorithm = account.accessToken.algorithm;
    const refreshTokenSecret    = account.refreshToken.secret;
    const refreshTokenExpiresIn = account.refreshToken.expiresIn;
    const refreshTokenAlgorithm = account.refreshToken.algorithm;

    //THe POST request put all parameters by x-www-form-urlencoded
    switch(req.body.grant_type){
      case "code":
      {
				let authCode 		= req.body.code;
        let clientId 		= req.body.client_id;
        let clientSecret = req.body.client_secret;

        return res.status(501).json({
            success: false,
            errCode: 501,
            errMsg: "auth_type_not_implemented_yet"
        });
        break;
			}
			case 'client_credential':
			{
        let clientId     = req.body.client_id;
        let clientSecret = req.body.client_secret;

        dbs.connectToMaster(function(err, db){
          if(err){
            logger.error(err);
            return res.status(500).json({
              success: false,
              errMsg: err.messag,
              internalError: err
            });
          }
          db.model('Client')
						.findById(clientId)
						.populate('account')
						.then(function(client){
              if(!client){
                res.status(401).json({
                  success: false,
                  errCode: 401,
                  errMsg: "invalid_client_credential"
                });

              }else{
                client.compareClientSecrect(clientSecret,
                    function(err, isMatched){

                  if(isMatched === true){
                    var claims = {
                      sub: client.name,
                      id: client._id,
                      ut: 'client',
                      scope: client.scope,
                      act: client.account.name,
                      iss: req.get('host')
                    };

                    var accessToken = jwt.sign(claims, accessTokenSecret
                                    ,{
                                        algorithms: [ accessTokenAlgorithm ]
                                        ,expiresIn: 86400
                                    });

                    var refreshToken = jwt.sign(claims, refreshTokenSecret
                                    ,{
                                        algorithms: [ refreshTokenAlgorithm ]
                                        ,expiresIn: 30 * 24 * 60 * 60
                                    });

                    res.json({
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
              }

            })
						.catch(function(err){
							console.error(err);
							return res.status(403).json({
								success: false,
								errMsg: "error_in_authenticate_client"
							})
						});
        });

        break;
			}
      case "password":
			{
        let username = req.body.username;
        let password = req.body.password;
				dbs.connectToMaster(function(err, db){
					if(err){
						logger.error(err);
						return res.status(500).json({
							success: false,
							errMsg: err.messag,
							internalError: err
						});
					}
					db.model('Account').getAuthenticated(username, password,
						function(err, user, reason){
								if(err){
									logger.error(err);
									return res.status(403).json({
										success: false,
										errCode: 403,
										errMsg: err.message,
										internalError: err
									});
								}

								if(user !== null){ //success
									//Generate JWT token
									var claims = {
										sub: user.username,
										ut: 'admin',
										act: user.name,
										iss: req.get('host')
									};
									var accessToken = jwt.sign(claims, user.accessToken.secret
																	,{
																			algorithms: [ user.accessToken.algorithm ]
																			,expiresIn: user.accessToken.expiresIn
																	});

									var refreshToken = jwt.sign(claims, user.refreshToken.secret
																	,{
																			algorithms: [ user.refreshToken.algorithm ]
																			,expiresIn: user.refreshToken.expiresIn
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
			}
			case 'refresh_token':
				//Refresh token logic
				debug("refresh_token: ", req.body.refresh_token);

				var refreshToken = req.body.refresh_token;
				if(!refreshToken){
					return res.status(403).json({
						success: false,
						errCode: 403,
						errMsg: "invalid_refresh_token"
					});
				}else{
					dbs.connectToMaster(function(err, db){
						if(err){
							logger.error(err);
							return res.status(500).json({
								success: false,
								errMsg: err.messag,
								internalError: err
							});
						}

						db.model("Account").findOne({
							name: accountName
						})
						.then(function(accountInstance){
							if(!accountInstance){
								return res.status(403).json({
									success: false,
									errMsg: "account_does_not_exist"
								})
							}


							jwt.verify(refreshToken, accountInstance.refreshToken.secret, { algorithms: [ accountInstance.refreshToken.algorithm ] }
			            ,function(err, token){

											debug("verified: ", token);
											if(err){
												console.error(err);
												return res.status(403).json({
													success: false,
													errCode: 403,
													errMsg: "invalid_refresh_token"
												});
											}

											if(token.ut === "admin"){
												var claims = {
													sub: accountInstance.username,
													ut: 'admin',
													act: accountInstance.name,
													iss: req.get('host')
												};


												var accessToken = jwt.sign(claims, accountInstance.accessToken.secret
																				,{
																						algorithms: [ accountInstance.accessToken.algorithm ]
																						,expiresIn: accountInstance.accessToken.expiresIn
																				});

												var refreshToken = jwt.sign(claims, accountInstance.refreshToken.secret
																				,{
																						algorithms: [ accountInstance.refreshToken.algorithm ]
																						,expiresIn: accountInstance.refreshToken.expiresIn
																				});
												return res.json({
													success: true
													,access_token: accessToken
													,refresh_token: refreshToken
												});
											}else{
												db.model('Client')
							            .findOne({
														_id: token.id
													})
													.populate('account')
													.then(function(client){
							              if(err){
							                debug(err);
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
															act: client.account.name,
															scope: client.scope,
					                    iss: req.get('host')
					                  };
														var accessToken = jwt.sign(claims, accessTokenSecret
					                                  ,{
					                                      algorithms: [ accessTokenAlgorithm ]
					                                      ,expiresIn: 86400
					                                  });

					                  var refreshToken = jwt.sign(claims, refreshTokenSecret
					                                  ,{
					                                      algorithms: [ refreshTokenAlgorithm ]
					                                      ,expiresIn: 30 * 24 * 60 * 60
					                                  });
					                  return res.json({
					                    success: true
					                    ,access_token: accessToken
					                    ,refresh_token: refreshToken
					                  });
							            });
											}
										})
						})
					});
				}
				break;
      default:
        return res.status(403).json({
          success: false,
          message: "non_supported_grant_type"
        });
		}
  });

	app.use('/oauth2admin', router);
}
