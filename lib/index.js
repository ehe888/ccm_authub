/**
 * Module of OAuth 2.0
 */

"use strict"

/**
 * Module entry
 * @param  {express} app    express instance
 * @param  {Object} options Initialize options
 *        {
 *        	jwt: {
 *        		secret: "thejswtsecret",
 *        		expiresIn: 7200,
 *          	algorithms: ['HS256', 'RS256', 'RS512']
 *        	}
 *        }
 */
module.exports = function(app, options){
  let _     = require("lodash")
    ,debug  = require('debug')('authub')
    ,urljoin = require('url-join')
    ,mongoose = require('mongoose')
    ,AuthubFilter = require('./filter')
    ,vericode  = require('./twofactor')
    ,path = require("path")
    ,fs = require('fs')
    ,HuyiSmsHandler = require('sms-gateway-huyi')
    ,randomstring 	= require("randomstring");

  let defaults = {
      mongodb: {
        url: "mongodb://localhost/",
        masterDb: "authub_master", //should never setup default db, prevent accidental override
        options: {}
      },
      //clientKey: "client.key"
  };

  let opts = _.merge(defaults, options);

  app.locals.x_config = opts;
  //Get private key

  let dbs = require('./models')({ server: opts.mongodb.url, masterDb: opts.mongodb.masterDb });
  app.locals.dbs = dbs;

  const VerificationProvider = opts.VerificationProvider || require('./utils/MongoVeriProvider');

  app.use(vericode({
    whitelist: [ /\/.*\/activate/ ]
    ,verificationProvider: VerificationProvider(dbs)
    ,expires: 5 * 60 * 1000
    ,smsTemplate: "您的验证码是：${veri_code}。请不要把验证码泄露给其他人。"
    ,smsHandler: HuyiSmsHandler({
      gateway: 'http://121.199.16.178/webservice/sms.php?method=Submit'
      ,account: 'cf_obizsoft'
      ,password: 'a123456'
    })
    ,email: {
      template: "您的验证码是：${veri_code}。请不要把验证码泄露给其他人。",
      port: 465,
      host: 'smtp.mxhichina.com',
      user: 'service@aivics.net',
      pass: '001@Helei',
      secure: true,
      debug: true,
      from: 'service@aivics.net'
    }
  }));

  /**
   * Module entry point
   * Retrieve general information from request, e.g.
   * 	Headers: X-Authub-Account
   *
   * Notes: This module must sit behind Proxy (nginx or nodejs-proxy)
   * Proxies will handle the URL rewrite and set headers
   */
  app.use(function(req, res, next){
    let accountName = req.get('X-Authub-Account') || req.query.authub_account;
    debug("account is : ", accountName);
    debug("headers: ", req.headers);
    dbs.connectToMaster(function(err, db){
      db.model("Account")
        .findOne({ name: accountName })
        .lean()
        .then(function(account){
            if(!account) throw new Error("invalid_account");
            res.locals.account = account;
            req.x_account_config = account;
            return next();
        })
        .catch(function(err){
            return res.status(500).json({
              success: false,
              errCode: 500,
              errMsg: err.message
            })
        });
    });
  });

  var filterOptions = {
    ignores: [
      [ /^\/oauth2\/.*/, /^(get|post)$/ig ],
      [ /^\/oauth2admin\/.*/, /^(get|post)$/ig ],
      [ /^\/.*\/activate.*/, /^(get|post)$/ig ],
      [ /^\/users\/forgot_password.*/, /^(get|post)$/ig ]
    ]
  };
  app.use(AuthubFilter().filter(filterOptions, function(identity, cb){
    if(identity.ut === 'admin'){
      return cb(null, false);
    }else if(identity.ut === 'client'){
      //TODO: Should verify if client are permitted to access the requested url!
      return cb(null, false);
    }else{
      return cb(null, false);
    }
  }));


  /**
   * Regsiter new administrator, which is only a user without a company link to it
   * 	- POST reqeust to create
   */
  app.post("/register", function(req, res, next){
    var name       = req.body.name
        ,fullname   = req.body.fullname
        ,username   = req.body.username     //creator's username
        ,email      = req.body.email        //creator's email
        ,mobile     = req.body.mobile       //creator's mobile
        ,password   = req.body.password     //creator's password
        ,firstName  = req.body.firstName    //creator's firstName
        ,lastName   = req.body.lastName;    //creator's lastName

    if(req.identity.ut !== 'client'){
      return res.status(403).json({
        success: false,
        errMsg: "invalid_identity_type"
      })
    }

    if(!req.identity.scope || req.identity.scope.indexOf("register") < 0){
      return res.status(403).json({
        success: false,
        errMsg: "this_client_are_not_allowed_to_do_this_operation"
      })
    }

    dbs.connectToMaster(function(err, db){
      db.model("Client").findOne({
        _id: req.identity.id
      })
      .then(function(client){
        if(!client){
          throw new Error("invalid_client");
        }else{
          return db.model("Account").create({
            name: name,
            fullname: fullname,
            username: username,
            password: password,
            mobile: mobile,
            email: email,
            firstName: firstName,
            lastName: lastName,
            accessToken: {
              secret: randomstring.generate(32)
            },
            refreshToken: {
              secret: randomstring.generate(64)
            },
            activated: false   //Should be removed when we have the activation process ready
          });
        }
      })
      .then(function(account){
        debug("account created : ", account);
        //TODO: send activation email to registered email address

        return res.status(201).json({
          success: true,
          name: account.name
        });
      })
      .catch(function(err){
          return res.status(500).json({
            success: false,
            errMsg: err.message
          });
      });
    });
  });

  /**
   * Create a new client for this account
   *
   * @param  {[request path]} "/[endpoint]/clients"
   * @param  {[callback]}     function(req, res,next)
   */
  app.post("/clients", function(req, res, next){
      let account = req.identity.act;

      dbs.connectToMaster(function(err, db){
        if(err){
          return res.status(500);
        }

        db.model("Account")
          .findOne({
            name: account
          })
          .then(function(instance){
            return db.model('Client')
              .generateClientAsync(instance);
          })
          .then(function(client){
            return res.status(201).json({
              success: true,
              data: client
            });
          })
          .catch(function(err){
            if(err){
              return res.status(500);
            }
            return res.status(200);
          });
      });
  });

  // var clientController = require("./controllers/Clients")(app, opts);
  var accountsController = require("./controllers/Accounts")(app, opts);
  var oauth2Controller = require("./controllers/OAuth2")(app, opts);
  var oauth2AdminController = require("./controllers/OAuth2Admin")(app, opts);
  var userController = require("./controllers/Users")(app, opts);
}
