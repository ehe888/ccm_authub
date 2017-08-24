const { should, expect }  = require('chai');
const accountService = require("../../lib/services/Account");
const dbs = require("./env").dbs;
const constants = require('../../lib/Constants');

const testAccountInput = {
  name: 'authub_master',
  username: 'lei.he@fastccm.com',
  mobile: '13764211365',
  email: 'lei.he@fastccm.com',
  fullname: "上海希希麦科技有限公司",
  lastName: "何",
  activated: true,
}

describe('Account', () => {
  it('register new account with new user', (done) => {
    dbs.connectToMaster((err, db) => {
      accountService.createNewAccount(testAccountInput, {
        db: db
      })
      .then( account => {
        expect(account).to.be.exist;
        expect(account.activated).to.be.true;

        return db.model('User')
                  .findOne({ username: account.username });
      })
      .then( user => {
        expect(user).to.be.exist;
        expect(user.activated).to.be.false;
        expect(user.authorized.includes(testAccountInput.name));
        done();
      })
      .catch( err => {
        done(err);
      })
    });
  }).timeout(5000);
})
