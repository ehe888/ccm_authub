//Account model unit test

const { should, expect }  = require('chai');

const dbs = require("./env").dbs;

const masterAccount = require("./env").masterAccount;

describe('Account', () => {
  it("Create", function(done){
    dbs.connectToMaster((err, db) => {
      db.model("Account")
        .create(masterAccount)
        .then((account) => {
          expect(account).to.exist;
          expect(account.name).to.equal(masterAccount.name);
          done();
        })
        .catch(function(err){
          return done(err);
        })
    })
  })

  it("Account name must be unique", function(done){
    dbs.connectToMaster((err, db) => {
      db.model("Account")
        .create(masterAccount)
        .then(function(account){
          if(account) done(new Error("create duplicated account"))
        })
        .catch(function(err){
          done()
        })
    })
  })
})
