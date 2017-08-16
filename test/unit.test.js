
const { dbs, dbOptions } = require("./unit/env");

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

require('./unit/Account');
require('./unit/Client');
require('./unit/User');
require('./unit/VeriCode');
