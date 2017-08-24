
const { dbs, dbOptions } = require("./services/env");

const DatabaseCleaner = require('database-cleaner');
const databaseCleaner = new DatabaseCleaner("mongodb");
const connect = require('mongodb').connect;


console.log(`${dbOptions.server}${dbOptions.masterDb}`);

before((done) => {
  connect(`${dbOptions.server}${dbOptions.masterDb}`, (err, db) => {
    databaseCleaner.clean(db, () => {
      console.log('done - clean');
      db.close();
      done();
    })
  })
})

require('./services/Account');
//require('./services/User');
