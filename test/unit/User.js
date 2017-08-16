// User Model Unit test
const { should, expect }  = require('chai');
const masterAccount = require("./env").masterAccount;

const dbs = require("./env").dbs;

const userTest1 = {
  username: 'test1',
  password: '12345678'
}

describe('User', () => {
  it('Create', (done) => {
    dbs.connectToMaster((err, db) => {
      db.model('User')
        .create(userTest1)
        .then((user) => {
          expect(user.username).to.equal(userTest1.username);
          expect(user.password).to.not.equal(userTest1.password);
          done();
        })
        .catch((error) => {
          done(error);
        })
    })
  })

  describe('None-Activated User', () => {
    beforeEach((done) => {
      //Cleanup before every test, remove userTest1
      dbs.connectToMaster((err, db) => {
        db.model('User')
          .remove({ username: userTest1.username })
          .then(() => {
            return db.model('User').create(userTest1);
          })
          .then((user) => {
            done();
          })
          .catch((error) => {
            done(error);
          })
      })
    })

    it('Cannot get authenticated', (done) => {
      dbs.connectToMaster((err, db) => {
        db.model('User')
          .getAuthenticated(userTest1.username, userTest1.password, (err, user) => {
            if(err){
              expect(err.message).to.equal(db.model('User').schema.failedLogin.NOT_ACTIVATED);
              return done();
            }
            done(new Error("Should not success"))
          })
      })
    })

    it('Activate', (done) => {
      dbs.connectToMaster((err, db) => {
        db.model('User')
          .findOne({ username: userTest1.username })
          .then((user) => {
            user.activated = true;
            return user.save();
          })
          .then((user) => {
            expect(user.activated).to.be.true;
            done();
          })
          .catch((error) => {
            done(error);
          })
      })
    })
  })

  describe("Activated User", () => {
    beforeEach((done) => {
      //Cleanup before every test, remove userTest1
      dbs.connectToMaster((err, db) => {
        db.model('User')
          .remove({ username: userTest1.username })
          .then(() => {
            return db.model('User').create(Object.assign({ activated: true }, userTest1 ));
          })
          .then((user) => {
            done();
          })
          .catch((error) => {
            done(error);
          })
      })
    })

    it('Authenticate', (done) => {
      dbs.connectToMaster((err, db) => {
        db.model('User')
          .getAuthenticated(userTest1.username, userTest1.password, (err, user) => {
            if(err){
              return done(err);
            }
            expect(user).to.be.not.null;
            expect(user.username).to.equal(userTest1.username)
            done()
          })
      })
    })

    it('Reset Password', (done) => {
      const newPassword = 'abc123456';

      dbs.connectToMaster((err, db) => {
        db.model('User')
          .resetPassword(userTest1.username, userTest1.password, newPassword, false, (err, user) => {
            if(err){
              return done(err);
            }

            //try to authenticate with new password
            db.model('User')
              .getAuthenticated(userTest1.username, newPassword, (err, user) => {
                if(err){
                  return done(err);
                }
                expect(user.username).to.equal(userTest1.username)
                done()
              })
          })
      })
    })
  })

  describe('Authorize to account', () => {
    it('Authorize', (done) => {
      dbs.connectToMaster((err, db) => {
        db.model('User')
          .findOne({ username: userTest1.username })
          .then((user) => {
            return user.authorize(masterAccount.name);
          })
          .then((user, numAffected) => {
            expect(user).to.exist;
            expect(user.authorized.includes(masterAccount.name)).to.be.true;
            done();
          })
          .catch( err => {
            done(err);
          })
      })
    })

    it('Unauthorize', (done) => {
      dbs.connectToMaster((err, db) => {
        db.model('User')
          .findOne({ username: userTest1.username })
          .then((user) => {
            return user.unauthorize(masterAccount.name);
          })
          .then((user, numAffected) => {
            expect(user).to.exist;
            expect(user.authorized.includes(masterAccount.name)).to.be.false;
            done();
          })
          .catch( err => {
            done(err);
          })
      })
    })
  })
})
