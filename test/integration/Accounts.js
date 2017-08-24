"use strict"

const request = require('supertest-as-promised');
const should  = require('chai').should;
const expect  = require('chai').expect;
const { app, masterAccount, masterClient, testAccount, dbs } = require('./env');

describe("Account", function(){

  // var jwtToken;
  //
  // it("Authencation", function(done){
  //   request(app)
  //     .post('/identity/oauth2admin/token')
  //     .set('X-Authub-Account', masterAccount.name)
  //     .send({
  //         username: masterAccount.username,
  //         password: masterAccount.password,
  //         grant_type: 'password'
  //     })
  //     .expect(200)
  //     .expect(function(res){
  //       if(!res.body.access_token) throw new Error("failed to get access_token");
  //       jwtToken = res.body;
  //     })
  //     .end((err, res) => {
  //       if(err) {
  //         return done(err);
  //       }
  //       return done();
  //     })
  // })
  //
  // it("Create new Client", function(done){
  //   request(app)
  //     .post('/identity/clients')
  //     .set('X-Authub-Account', masterAccount.name)
  //     .set("Authorization", "Bearer " + jwtToken.access_token )
  //     .send({})
  //     .expect(201)
  //     .expect(function(res){
  //
  //     })
  //     .end(done);
  // })
  const testAccountInput = {
    name: 'authub_master',
    mobile: '13764211365',
    email: 'lei.he@fastccm.com',
    fullname: "上海希希麦科技有限公司",
    lastName: "何",
    activated: true
  }

  it("Register new account", (done) => {
    request(app)
      .post('/identity/accounts/register')
      .set('Content-Type', 'application/json')
      .send(testAccountInput)
      .expect(201)
      .then((res) => {
        expect(res.body.success).to.be.true;
        expect(res.body.account.name).to.equal(testAccountInput.name);
        expect(res.body.account.activated).to.be.true;
        done();
      })
      .catch(function(err){
        done(err);
      });
  }).timeout(15000);

  // describe('Register Account', () => {



    //一般的用户不能注册新账号
    // it("Administrator user cannot Register new account", (done) => {
    //   request(app)
    //     .post('/identity/oauth2admin/token')
    //     .set('X-Authub-Account', masterAccount.name)
    //     .send({
    //         username: masterAccount.username,
    //         password: masterAccount.password,
    //         grant_type: 'password'
    //     })
    //     .expect(200)
    //     .then((res) => {
    //       let jwtToken = res.body;
    //       return request(app)
    //         .post('/identity/register')
    //         .set('X-Authub-Account', masterAccount.name)
    //         .set("Authorization", "Bearer " + jwtToken.access_token )
    //         .set('Content-Type', 'application/json')
    //         .send(testAccount)
    //         .expect(403)
    //     })
    //     .then((res) => {
    //       done();
    //     })
    //     .catch(function(err){
    //       done(err);
    //     })
    // })
    //
    // it("Client register new account", (done) => {
    //   request(app)
    //     .post('/identity/oauth2admin/token')
    //     .set('X-Authub-Account', masterAccount.name)
    //     .send({
    //       client_id: masterClient.id,
    //       client_secret: masterClient.secret,
    //       grant_type: 'client_credential'
    //     })
    //     .expect(200)
    //     .then((res) => {
    //       console.log("===> auth token: " + res.body.access_token);
    //
    //       let jwtToken = res.body;
    //       return request(app)
    //         .post('/identity/register')
    //         .set('X-Authub-Account', masterAccount.name)
    //         .set("Authorization", "Bearer " + jwtToken.access_token )
    //         .set('Content-Type', 'application/json')
    //         .send(testAccount)
    //         .expect(201)
    //     })
    //     .then((res) => {
    //       expect(res.body.success).to.be.true;
    //       expect(res.body.name).to.equal('aivics');
    //       done();
    //     })
    //     .catch(function(err){
    //       done(err);
    //     })
    // })
    //
    // it("Non-Activate account cannot get authenticated", (done) => {
    //   request(app)
    //     .post('/identity/oauth2admin/token')
    //     .set('X-Authub-Account', testAccount.name)
    //     .send({
    //         username: testAccount.username,
    //         password: testAccount.password,
    //         grant_type: 'password'
    //     })
    //     .expect(403)
    //     .end((err, res) => {
    //       expect(res.body.errMsg).to.equal("user_account_not_activated_yet");
    //       done();
    //     });
    // })
  // })

  // describe('Activation', () => {
  //   var veriCode;
  //   var activationToken;
  //
  //
  //   it("Step1. Get Verification Code", (done) => {
  //     let data = {
  //       identity: testAccount.email,
  //       veri_type: 'email',
  //       target_url: "/accounts/activate"
  //     };
  //     request(app)
  //       .post('/identity/vericode/code')
  //       .send( data )
  //       .expect(201)
  //       .then(function(res){
  //         console.log(res.body);
  //         veriCode = res.body.veri_code;
  //         expect(veriCode.length).to.gt(0);
  //         done();
  //       })
  //       .catch(function(err){
  //         done(err);
  //       });
  //   }).timeout(5000);
  //
  //   it('Step2. Exchange CODE for activation TOKEN', (done) => {
  //     let data = {
  //       identity: testAccount.email,
  //       veri_code: veriCode
  //     };
  //     request(app)
  //       .post('/identity/vericode/validate')
  //       .send( data )
  //       .expect(201)
  //       .then((res) => {
  //         activationToken = res.body.vericode_token;
  //         console.log('activationToken: ', activationToken);
  //         expect(activationToken).is.not.null;
  //         done();
  //       })
  //       .catch((err) => {
  //         done(err);
  //       })
  //   })
  //
  //   it("Step3. 成功激活Admin Account", (done) => {
  //     request(app)
  //       .get('/identity/accounts/activate')
  //       .set('X-Authub-Account', testAccount.name)
  //       .send({ vericode_token: activationToken })
  //       .expect(200)
  //       .then((res) => {
  //         return request(app)
  //           .post('/identity/oauth2admin/token')
  //           .set('X-Authub-Account', testAccount.name)
  //           .send({
  //             username: testAccount.username,
  //             password: testAccount.password,
  //             grant_type: 'password'
  //           })
  //           .expect(200)
  //       })
  //       .then((res) => {
  //         done()
  //       })
  //       .catch((err) => {
  //         done(err);
  //       });
  //   });
  // })


  // describe('Double Activation', () => {
  //   var veriCode;
  //   var activationToken;
  //
  //
  //   it("Step1. Get Verification Code", (done) => {
  //     let data = {
  //       identity: testAccount.email,
  //       veri_type: 'email',
  //       target_url: "/accounts/activate"
  //     };
  //     request(app)
  //       .post('/identity/vericode/code')
  //       .send( data )
  //       .expect(201)
  //       .then(function(res){
  //         veriCode = res.body.veri_code;
  //         expect(veriCode.length).to.gt(0);
  //         done();
  //       })
  //       .catch(function(err){
  //         done(err);
  //       });
  //   }).timeout(5000);
  //
  //   it('Step2. Exchange CODE for activation TOKEN', (done) => {
  //     let data = {
  //       identity: testAccount.email,
  //       veri_code: veriCode
  //     };
  //     request(app)
  //       .post('/identity/vericode/validate')
  //       .send( data )
  //       .expect(201)
  //       .then((res) => {
  //         activationToken = res.body.vericode_token;
  //         console.log('activationToken: ', activationToken);
  //         expect(activationToken).is.not.null;
  //         done();
  //       })
  //       .catch((err) => {
  //         done(err);
  //       })
  //   })
  //
  //   it("Step3. 成功激活Admin Account", (done) => {
  //     request(app)
  //       .get('/identity/accounts/activate')
  //       .set('X-Authub-Account', testAccount.name)
  //       .send({ vericode_token: activationToken })
  //       .expect(200)
  //       .end(function(err, res){
  //         if(err) return done(err);
  //         done();
  //       });
  //   });
  // })
})
