"use strict"

/**
 * A simple SMS Gateay SDK for iHuyi service
 * This service provider currently only support Chinese mobile numbers
 * We need config sms gateway via options, e.g.
        gateway: 'https://smsgateway.com'     //Optional, there is a default value
        account: 'abc'                        //Optional, but if it is empty you will got error response from Gateway
        password: '123'

 * DEBUG:
    Just switch DEBUG=huyi-sms then you can get debug outputs
 */
exports = module.exports = function(options){
  let webRequest  = require('request')
      ,parseString  = require('xml2js').parseString
      ,debug      = require('debug')('huyi-sms');

  let gateway = options.gateway || "http://121.199.16.178/webservice/sms.php?method=Submit";
  let account = options.account || "";
  let password = options.password || "";

  return {
    send: function(mobile, country, message, done){
      webRequest.post(gateway
            , {
                form:{ account:account, password: password, mobile:mobile, content: message }
                ,headers: { 'Accept': 'application/json' }
              }
            , function(err, res){
                debug("===========> SENDING SMS ERROR:", err);
                if(err) return done(err);

                debug("===========> SMS GATEWAY RESPONSE", res.body);
                parseString(res.body, function(err, result){
                  if(err) return done(err);

                  console.dir(result);

                  if(result.SubmitResult.code[0] === '2')
                      return done(null, result);
                  else {
                      return done(new Error(result.SubmitResult.code[0]), result);
                  }
                });
            });
    }
  }
}
