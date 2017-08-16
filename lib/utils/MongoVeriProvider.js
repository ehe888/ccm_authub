
const self = module.exports = function(dbs){

  return function(opt){
    return {
      generate: function(identity, expires, targetUrl, done){
        dbs.connectToMaster(function(err, db){
          if(err){
            return done(err);
          }
          return db.model("VeriCode").generate(identity, expires, targetUrl, done);
        })
      },
      validate: function(identity, code, done){
        dbs.connectToMaster(function(err, db){
          if(err){
            return done(err);
          }
          return db.model("VeriCode").validate(identity, code, done);
        })
      }
    }
  }
}
