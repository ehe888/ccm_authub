
let randomstring 	= require("randomstring");

let self = module.exports = function(dbs){
  return function(opt){
    return {
      generate: function(identity, expires, targetUrl, done){
        return done(null, "8888")
      },
      validate: function(identity, code, done){
        return done(null, randomstring.generate(32), instance.targetUrl)
      }
    }
  }
}
