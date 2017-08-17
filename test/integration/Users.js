"use strict"

const request = require('supertest-as-promised');
const should  = require('chai').should;
const expect  = require('chai').expect;
const { app, masterAccount, masterClient, testAccount, dbs } = require('./env');

const testUser1 = {
  username: 'ehe8888',
  password: '123456',
  mobile: '13764211365',
  email: 'lei.he@aivics.com',
  staff: 'S001',
  firstName: 'Lei',
  lastName: 'He'
};


describe('User', () => {
  var jwtToken;

  before((done) => {
    request(app)
      .post('/identity/oauth2admin/token')
      .set('X-Authub-Account', masterAccount.name)
      .send({
          username: masterAccount.username,
          password: masterAccount.password,
          grant_type: 'password'
      })
      .then((res) => {
        jwtToken = res.body;
        done();
      })
      .catch((err) => {
        done(err);
      })
  })

  it('Create/Register new User', (done) => {
    request(app)
      .post('/identity/users')
      .set('X-Authub-Account', masterAccount.name)
      .set("Authorization", "Bearer " + jwtToken.access_token )
      .send(testUser1)
      .expect(201)
      .then((res) => {
        done();
      })
      .catch((err) => {
        done(err);
      });
  })

  describe('Activation', () => {
    var veriCode;
    var activationToken;
    var newPassword = 'Abcd1234';

    it("Step1. Get Verification Code", (done) => {
      var data = {
        identity: testUser1.email,
        veri_type: 'email',
        target_url: "/users/activate"
      };
      request(app)
        .post('/identity/vericode/code')
        .send( data )
        .expect(201)
        .then(function(res){
          veriCode = res.body.veri_code;
          expect(veriCode.length).to.gt(0);
          done();
        })
        .catch(function(err){
          done(err);
        });
    }).timeout(5000);

    it('Step2. Exchange CODE for activation TOKEN', (done) => {
      var data = {
        identity: testUser1.email,
        veri_code: veriCode
      };
      request(app)
        .post('/identity/vericode/validate')
        .send( data )
        .expect(201)
        .then((res) => {
          activationToken = res.body.vericode_token;
          console.log('activationToken: ', activationToken);
          expect(activationToken).is.not.null;
          done();
        })
        .catch((err) => {
          done(err);
        });
    });

    it("Step3. Activate User", (done) => {
      request(app)
        .get('/identity/users/activate')
        .set('X-Authub-Account', masterAccount.name)
        .send({ vericode_token: activationToken })
        .expect(200)
        .then((res) => {
          return request(app)
            .post('/identity/oauth2/token')
            .set('X-Authub-Account', masterAccount.name)
            .send({
              username: testUser1.username,
              password: testUser1.password,
              grant_type: 'password'
            })
            .expect(200)
        })
        .then((res) => {
          done()
        })
        .catch((err) => {
          done(err);
        });
    });

    it('Reset Password', (done) => {
      return request(app)
        .post('/identity/oauth2/token')
        .set('X-Authub-Account', masterAccount.name)
        .send({
          username: testUser1.username,
          password: testUser1.password,
          grant_type: 'password'
        })
        .expect(200)
        .then((res) => {
          let token = res.body;
          return request(app)
            .post('/identity/users/reset_password')
            .set('X-Authub-Account', masterAccount.name)
            .set('Authorization', "Bearer " + token.access_token)
            .send({
                old_password: testUser1.password,
                new_password: newPassword,
            })
            .expect(200)
        })
        .then((res) => {
          return request(app)
            .post('/identity/oauth2/token')
            .set('X-Authub-Account', masterAccount.name)
            .send({
                username: testUser1.username,
                password: newPassword,
                grant_type: 'password'
            })
            .expect(200)
        })
        .then((res) => {
          done();
        })
        .catch((err) => {
          done(err);
        })
    })
  })

  describe('Forgot Password', () => {
    it('Request to change password', (done) => {
      return request(app)
        .get('/identity/users/forgot_password')
        .set('X-Authub-Account', masterAccount.name)
        .query({ email: testUser1.email })
        .expect(200)
        .then( res => {
          done();
        })
        .catch( err => {
          console.log(err);
          done(err);
        })
    }).timeout(5000);

    it('Change password with forgot password token', (done) => {
      dbs.connectToMaster((err, db) => {
        db.model('ForgotPasswordRequest')
          .findOne({ identity: testUser1.email, used: false })
          .sort({ createdAt: 'desc'})
          .then( forgotPasswordRequest => {
            return request(app)
              .post('/identity/users/forgot_password')
              .set('X-Authub-Account', masterAccount.name)
              .send({
                email: forgotPasswordRequest.identity,
                token: forgotPasswordRequest.token,
                password: 'Abc789'
              })
              .expect(200)
          })
          .then( res => {
            return request(app)
              .post('/identity/oauth2/token')
              .set('X-Authub-Account', masterAccount.name)
              .send({
                  username: testUser1.username,
                  password: 'Abc789',
                  grant_type: 'password'
              })
              .expect(200)
          })
          .then( res => {
            done();
          })
          .catch( err => {
            done(err)
          })
      })
    })
  })
})
