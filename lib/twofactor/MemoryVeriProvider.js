"user strict"

const self = module.exports = function(options){
  const _       = require('lodash');
  const randomstring  = require('randomstring');
  const uuid     = require('node-uuid');

  const codes = [];


  return {
    generate: function(identity, expires, targetUrl, done){
      var code = { identity: identity
                  ,veri_code: randomstring.generate({
                    length: 4,
                    charset: '1234567890'
                  })
                  ,expiresAt: _.now() + options.expires
                  ,used: false
                  ,targetUrl: targetUrl
                };

      codes.push(code);

      return done(null, code.veri_code);
    }
    ,validate: function(identity, code, done){
      var code = _.find(codes, function(o){ return (o.identity === identity && o.code === code && o.used === false ); });
      if(!code){
        return done(new Error('invalid_code'));
      }

      if(code.expiresAt < _.now()){
        return done(new Error('code_expired'));
      }

      var token = uuid.v4();
      return done(null, token, code.targetUrl);
    }
  }
}
