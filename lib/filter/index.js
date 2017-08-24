"use strict"

const logger 	= require('../logger');
const _       = require('lodash');
const jwt     = require("jsonwebtoken");
const config  = require('../../config');


/**
 * retrieve OAuth2.0 Bearer token from request, three places will be check:
 * 		1. Request Header Authorization
 * 		2. Request query parameter x_bearer
 * 		3. Request cookie x_bearer
 * NOTES: This module depends on cookie parsers, so please use cookie parser before this middleware
 * @param  {Request} req express request object
 * @return {string}  unverified jwt token
 */
function getBearerToken(req){
  var bearer = req.headers['authorization'];
  var accessToken;

  if(bearer){
    accessToken = bearer.substring("Bearer".length).trim();
  }


  if(_.isEmpty(accessToken)){
    //Try to get token from url query parameter
    accessToken = req.query.x_bearer;
  }

  if(_.isEmpty(accessToken) && req.cookies){
    accessToken = req.cookies.x_bearer;
  }
  return accessToken;
}

function AuthubFilter(){
  if(!(this instanceof AuthubFilter)){
    return new AuthubFilter();
  }
}

/**
 * Middleware to handle oauth2 request
 *  Depends on the account configuration object setted before this Middleware
 *  User should properly setup account object in request object:
 *   req.x_account_config = {
 *   	name: 'abc'
 *   	,accessToken: {
 *   		secret: '',
 *   		algorithm: 'HS256'
 *   	}
 *   }
 */
AuthubFilter.prototype.filter = function(options, authorizeHandler) {

  var ignores = options.ignores;

  return function(req, res, next){

    var ignorePath = false;
    if(_.isArray(ignores)){

      _.forEach(ignores, function(value, index, collection){
        logger.debug("ignore path pattern: ", value);
        logger.debug("path: ", req.path);

        var pathPattern;
        var pathMethod;

        if(_.isRegExp(value)){
          pathPattern = value;
        }
        if(_.isArray(value) && value.length >= 2){
          pathPattern = value[0];
          pathMethod = value[1];
        }

        if(_.isRegExp(pathPattern)){
            var result = req.path.match(pathPattern);
            logger.debug("regexp match result: ", result);
            if(!_.isEmpty(result)){
              logger.debug("pathmethod pattern: ",pathMethod, _.isRegExp(pathMethod));
              if(_.isRegExp(pathMethod)){
                logger.debug("request method: ", req.method);
                var methodResult = req.method.match(pathMethod);
                if(!_.isEmpty(methodResult)){
                  ignorePath = true;
                }else{
                  ignorePath = false;
                }
              }else{
                ignorePath = true;
              }
            }
        }
      });
    }

    if(ignorePath){
      return next();
    }

    if(!_.isFunction(authorizeHandler)){
      return res.status(500).json({
        success: false,
        errCode: 500,
        errMsg: "invalid_authorization_handler"
      });
    }


    var account = res.locals.account;

    // if(!account){
    //   return res.status(500).json({
    //     success: false,
    //     errCode: 500,
    //     errMsg: "please_config_jwt_options_properly"
    //   });
    // }



    jwt.verify(getBearerToken(req), config.accessToken.secret
            , { algorithms: [ config.accessToken.algorithm ] }
            , function(err, token){
      if(err){
        logger.error(err);
        return res.status(403).json({
          success: false,
          errCode: 403,
          errMsg: "forbidden"
        });
      }
      return authorizeHandler(token, function(err, denied){
        if(err){
          logger.error(err);
          return res.status(500).json({
            success: false,
            errCode: 500,
            errMsg: "There are problems to handle authorization, detail: " + err.message
          });
        }

        if(!denied){
          res.locals.token = token;
          req.identity = token;
          return next();
        }else{
          return res.status(403).json({
            success: false,
            errCode: 403,
            errMsg: "access_denied"
          });
        }
      });
    });
  }
};

module.exports = AuthubFilter;
