"user strict"

var self = module.exports = function(options){
  var _       = require('lodash')
    ,debug    = require('debug')('authub')
    ,randomstring = require('randomstring')
    ,uuid     = require('node-uuid');
  var sqlite3 = require('sqlite3').verbose();
  var db      = new sqlite3.Database(':memory:');


  db.serialize(function() {
    db.run("CREATE TABLE verification_codes(id INTEGER PRIMARY KEY AUTOINCREMENT, "
        + "identity TEXT NOT NULL, veri_code TEXT NOT NULL, used BOOLEAN, target_url TEXT NOT NULL,"
        + "expires_at DATETIME )");
  });



  return {
    generate: function(identity, expires, targetUrl, done){
      var stmt = db.prepare("INSERT INTO verification_codes(identity, veri_code, expires_at, used, target_url) "
                        + " VALUES (?,?,?,?,?)");

      var veri_code = randomstring.generate({
        length: 4,
        charset: '1234567890'
      });

      stmt.run([identity, veri_code, _.now() + expires, false, targetUrl ]
          , function(err){
            if(err){
              console.log(err);
              return done(err);
            }

            return done(null, veri_code);
          });

      stmt.finalize();
    }

    ,validate: function(identity, code, done){

      console.log(identity, code);

      var stmt = db.prepare("SELECT * FROM verification_codes WHERE identity=? and veri_code=? and used=?");
      stmt.all([ identity, code, 0 ], function(err, rows){
        if(err || _.isEmpty(rows)){

            return done(new Error('invalid_verification_code'), null);
        }else{
            var row = rows[0];
            debug("validating row: ", row);
            //Should also delete the record
            if(row.expires_at < _.now()){
              return done(new Error('code_expired'));
            }
            var token = uuid.v4();
            return done(null, token, row.target_url);
        }
      });
      stmt.finalize();

    }
  }
}
