// integration

const { dbs, dbOptions, masterAccount, masterClient } = require('./integration/env')

const DatabaseCleaner = require('database-cleaner');
const databaseCleaner = new DatabaseCleaner("mongodb");
const connect = require('mongodb').connect;


// Before test setup DB.
before((done) => {
  connect(`${dbOptions.server}${dbOptions.masterDb}`, (err, db) => {
    if(err){
      return done(err);
    }
    
    databaseCleaner.clean(db, () => {
      console.log('done - clean');
      db.close();
      done();
      //Setup inital data

      // dbs.connectToMaster((err, db) => {
      //   db.model('Account')
      //     .create(masterAccount)
      //     .then((account) => {
      //       return db.model('Client')
      //               .create(Object.assign({}, masterClient, { account: account }));
      //     })
      //     .then((client) => {
      //       masterClient.id = client.id;
      //       done();
      //     })
      //     .catch( err => {
      //       done(err);
      //     })
      // })
    })
  })
})

//After test cleanup
after((done) => {
  done();
})

require("./integration/Accounts");
//require("./integration/Users");
