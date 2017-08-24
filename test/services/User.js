const { should, expect }  = require('chai');
const userService = require("../../lib/services/User");
const dbs = require("./env").dbs;
const sendMail = require('../../lib/utils/MailSender');
const constants = require('../../lib/Constants');

const userTest1 = {
  username: 'test1',
  password: '12345678',
  email: 'lei.he@aivics.com',
}

describe('User', () => {
  it('register new user', (done) => {
    dbs.connectToMaster((err, db) => {
      userService.register(userTest1, {
        db: db,
        sendMail: sendMail,
        operator: 'superuser',
      })
      .then( user => {
        expect(user).to.be.exist;
        expect(user.activated).to.be.false;

        return db.model('TwoFactorVerification')
                  .findOne({ identity: userTest1.email, vtype: constants.VTYPE_USER_REGISTRATION });
      })
      .then( instance => {
        expect(instance).to.be.exist;
        done();
      })
      .catch( err => {
        done(err);
      })
    })

  }).timeout(5000);

  it('Activate new user', (done) => {
    dbs.connectToMaster((err, db) => {
      db.model('TwoFactorVerification')
        .findOne({ identity: userTest1.email, vtype: constants.VTYPE_USER_REGISTRATION })
        .then( instance => {
          return userService.activate({
              identity: userTest1.email,
              token: instance.token,
              code: instance.code,
              password: userTest1.password,
            }, {
              db: db
            })
        })
        .then( user => {
          expect(user).to.be.exist;
          expect(user.activated).to.be.true;

          return db.model('TwoFactorVerification')
                    .findOne({ identity: userTest1.email, vtype: constants.VTYPE_USER_REGISTRATION });
        })
        .then( instance => {
          expect(instance).to.be.null;
          done();
        })
        .catch( err => {
          done(err);
        })
    })
  })

  it('Authorize to account', (done) => {
    dbs.connectToMaster((err, db) => {
      userService.authorizeToAccount({ account: 'someaccount', username: userTest1.username },
            { db: db, sendMail: sendMail, })
        .then( user => {
          expect(user).to.exist;
          expect(user.authorized.includes('someaccount')).to.be.true;
          done();
        })
        .catch(err => {
          done(err);
        })
    });
  });
})
