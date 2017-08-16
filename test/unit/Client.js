//Client model unit test

const { should, expect }  = require('chai');

const dbs = require("./env").dbs;

const masterAccount = require("./env").masterAccount;

const masterClient = require("./env").masterClient;

const testClient = Object.assign({}, masterClient);

describe('Client', () => {

  let clientId;

  before((done) => {
    //Prepare masterClient, set account to masterAccount
    dbs.connectToMaster((err, db) => {
      db.model('Account')
        .findOne({ name: masterAccount.name })
        .lean()
        .then( account => {
          testClient.account = account;
          done();
        })
        .catch(err => {
          done(err);
        })
    })
  })

  it("Create", function(done){
    dbs.connectToMaster(function(err, db){
      return db.model("Client")
      .create(testClient)
      .then((client) => {
        expect(client._id).to.exist;
        clientId = client._id;
        done();
      })
      .catch(function(err){
        return done(err);
      })
    })
  });

  it("compareClientSecrectAsync", function(done){

    dbs.connectToMaster(function(err, db){
      console.log("clientId: ", clientId)

      db.model("Client")
      .findOne({ name: testClient.name  })
      .then((client) => {
        console.log(client)
        return client.compareClientSecrectAsync(testClient.secret);
      })
      .then((isMatch) => {
        expect(isMatch).to.be.true;
        done();
      })
      .catch((err) => {
        done(err);
      })
    })
  })
});
