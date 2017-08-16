"use strict"

/**
 * This is a express middleware that handle very common Verification CODE flow.
 * This module need to parse the form parameters POST by clients
 * So a body-parser middleware is required before this middleware
 *
 * To use this middleware:
 *      var vericode = require('express-vericode')(options);
 *      app.use(bodyParser);
 *      app.use(cookieParser);
 *      app.use(vericode);
 *
 * Options must follow below spec:
 *    endpoint      - optional, default '/vericode'
 *    expires       - optional, default 5minutes - 5*60*1000 milliseconds
 *    secret        - JwtSecret
 *    algorithms    - JWT Encryption algorithms ['HS256', 'RS256', 'RS512']
 *    tokenExpires  - JWT Token Max Aage in milliseconds
 *    identity      - optional, default ['mobile', 'email'], the field name of the identity to identify the user
 *    verificationProvider  - optional, default MemoryCodeProvider, manage CODEs e.g. generate, save, validate
 *    whitelist     - Array hold regex of URLs that need a valid token to proceed, URLs should be relative path to ROOT,
                      URLs can also been Regexp
      {
        endpoint: '/vericode'
        ,secret: 'thi$i$the$ecret0fJWT'
        ,expires: 5 * 60 * 1000
        ,tokenExpires: 10 * 60 * 1000
        ,algorithms: ['HS256', 'RS256', 'RS512']
        ,verificationProvider: MemoryCodeProvider
        ,smsTemplate: "${code}"
        ,emailTemplate: "${code}"
        ,smsHandler: null
        ,emailHandler: null
        ,whitelist: []
      }

 *    HOW TO DEBUG:
 *      DEBUG=express-vericode
 */

exports = module.exports = function(options){
  const _       = require('lodash');
  const debug    = require('debug')('twofactor-verification');
  const jwt      = require('jsonwebtoken');
  const urljoin  = require('url-join');
  const template = require('es6-template-strings');
  /*
  * First of all - parse options to setup configurations
  */
  const opt = _.merge({
                      endpoint: '/vericode'
                      ,secret: 'thi$i$the$ecret0fJWT'
                      ,expires: 30 * 60 * 1000
                      ,tokenExpires: 5 * 60 * 1000
                      ,algorithms: ['HS256', 'RS256', 'RS512']
                      ,whitelist: [ ]
                      ,smsTemplate: "您的验证码是：${veri_code}。请不要把验证码泄露给其他人。"
                      ,email: { //smtp server config, refer to https://github.com/nodemailer/smtp-connection
                        template: "您的验证码是：${veri_code}。请不要把验证码泄露给其他人。"
                      }
                    },  options );

  const endpoint      = opt.endpoint; /* the default entry url */
  const expires       = opt.expires; /* in milliseconds */
  const authProvider  = opt.authProvider; /* just simple memory authentication provider */
  const jwtSecret     = opt.secret;
  const tokenExpires  = opt.tokenExpires;
  const algorithms    = opt.algorithms;
  const verificationProvider  = opt.verificationProvider(opt) || require('./MemoryVeriProvider')(opt);
  const smsHandler    = opt.smsHandler;
  const smsTemplate   = opt.smsTemplate;
  const whitelist     = opt.whitelist;
  // let SMTPConnection = require('smtp-connection');
  const nodemailer    = require('nodemailer');


  const ENDPOINT_CODE       = _.toLower(urljoin(endpoint, 'code')); /* Path to generate code */
  const ENDPOINT_VALIDATE   = _.toLower(urljoin(endpoint, 'validate')); /* Path to validate code and generate token */

  /**
   *  /vericode/code handler - only POST reuest supported
   * @param identity  - code generation identity - it could be mobile or email
   * @param veri_type - mobile or email or anything supported in the future
   */
  function getCode(req, res, next){
    if(_.toUpper(req.method) !== 'POST'){
      return res.status(405).json({
        success: false,
        errCode: '405',
        errMsg: 'only_post_method_supported'
      });
    }
    /**
     *  First of all - parse parameters to get grant_type
     */

     const identity      = req.body.identity;
     const type          = req.body.veri_type;
     const targetUrl     = req.body.target_url;


     if(!identity){
       return res.status(403).json({
         success: false,
         errMsg: 'missing_identity'
       });
     }

     verificationProvider.generate(identity, expires, targetUrl, function(err, veri_code){
       switch (type) {
         case 'mobile':
            //Send SMS
            if(smsHandler){
              var message = template(smsTemplate, { veri_code: veri_code });
              /* the second parameter is country code */
              smsHandler.send(identity, null, message, function(err, response){
                debug("sms response: ", response);
                if(err) return res.status(403).json({
                  success: false
                  ,errCode: 403
                  ,errMsg: err.message
                });

                return res.status(201).json({
                  success: true,
                  veri_code: (process.env.NODE_ENV === 'development' ? veri_code : '')
                });
              });
            }

            break;
         case 'email':
            //Send Email via codeHandler
            var message = template(opt.email.template, { veri_code: veri_code });
            var transporter = nodemailer.createTransport({
              port: process.env.X_VERICODE_SMTP_PORT || opt.email.port || 465
              ,host: process.env.X_VERICODE_SMTP_HOST || opt.email.host || 'smtp.mxhichina.com'
              ,secure: process.env.X_VERICODE_SMTP_SECURE || opt.email.secure || true
              ,debug: process.env.X_VERICODE_SMTP_DEBUG || opt.email.debug || false
              ,auth: {
                user: process.env.X_VERICODE_SMTP_USER || opt.email.user,
                pass: process.env.X_VERICODE_SMTP_PASS || opt.email.pass
              }
            });

            var mailOptions = {
                from: '"Service" ' + (process.env.X_VERICODE_SMTP_FROM  || opt.email.from), // sender address
                to: [ identity ], // list of receivers
                subject: '验证码', // Subject line
                html: message // html body
            };

            transporter.sendMail(mailOptions, function(err, info){
                if(err){
                  debug("smtp login err: ", err);
                  return res.status(500).json({
                    success: false
                    ,errCode: 500
                    ,errMsg: err.message
                  });
                }
                debug("email sent: ", info.response);
                return res.status(201).json({
                  success: true,
                  veri_code: (process.env.NODE_ENV === 'development' ? veri_code : '')
                });
            });
            break;
         default:
            return res.status(403).json({
              success: false,
              errCode: 403,
              errMsg: 'invalid_verification_type'
            });
       }
     });
  }

  /**
   * /vericode/validate handler - only POST request method supported test if the token is valid,
   * @param identity  - mobile phone number w/ country code
   * @param veri_code     - code granted for this request
   */
  function validate(req, res, next){
    if(_.toUpper(req.method) !== 'POST'){
      return res.status(405).json({
        success: false,
        errCode: '405',
        errMsg: 'only_post_method_supported'
      });
    }

    var identity  = req.body.identity; //identity could be email or mobile or maybe some social id
    var code      = req.body.veri_code;

    verificationProvider.validate(identity, code, function(err, token, targetUrl){
      if(err) return res.status(403).json({
        success: false,
        errCode: 403,
        errMsg: err.message
      });

      debug("targetUrl: ", targetUrl);
      return res.status(201).json({
        success: true,
        vericode_token: jwt.sign({ identity: identity, token: token, target_url: targetUrl }, jwtSecret, {
          algorithms: algorithms
          , expiresIn: tokenExpires / 1000
        })
      });
    });
  }

  return function(req, res, next){
    debug(req.originalUrl);

    //Process /vericode/code request
    if(_.startsWith( _.toLower(req.path), ENDPOINT_CODE )){
      return getCode(req, res, next);
    }

    //Process /oauth2/register request
    if(_.startsWith( _.toLower(req.path), ENDPOINT_VALIDATE)){
      return validate(req, res, next);
    }

    var shouldBeValidated = false;

    _.forEach(whitelist, elem => {
        if(_.isRegExp(elem)){
          shouldBeValidated = elem.test(req.path);
          return false;
        }
    });

    if(shouldBeValidated){
      var token = req.query.vericode_token || req.params.vericode_token || req.body.vericode_token;
  	  if(!token){
  	    //Access denied - 403 Forbidden
        return res.status(403).json({
          success: false,
          errCode: 403,
          errMsg: 'access_denied_no_veri_token'
        });
  	  }

      return jwt.verify(token, jwtSecret, { algorithms: algorithms }
        ,function(err, verifiedToken){
          if(err) return res.status(403).json({
            success: false,
            errCode: 403,
            errMsg: err.message
          });

          if(verifiedToken){
            res.locals.vericode_token = verifiedToken; //{ token: token }
            //Check if the tagetUrl match
            var targetUrl = verifiedToken.target_url;
            debug(verifiedToken);
            debug(targetUrl, req.path);
            if(targetUrl && targetUrl === req.path ){
              return next();
            }else{
              res.status(403).json({
                success: false,
                errCode: 403,
                errMsg: "access_denied_because_of_url_not_match"
              });
            }
          }else{
            return res.status(403).json({
              success: false,
              errCode: 403,
              errMsg: "access_denied_because_of_invalid_token"
            });
          }
      });
    }else{
      return next();
    }
  }
}
