
describe("Client", function(){
  let jwtToken;
  let masterClientJwtToken;

  before((done) => {
    //Prepare test case

  })

  it("Get AccessToken", (done) => {
    var data = {
      client_id: masterClient.id,
      client_secret: masterClient.secret,
      grant_type: 'client_credential'
    }
    request(app)
      .post('/identity/oauth2admin/token')
      .set('X-Authub-Account', masterAccount.name)
      .send(data)
      .expect(200)
      .expect(function(res){
        masterClientJwtToken = res.body;
      })
      .end(function(err, res){
        if(err) return done(err);
        done();
      });
  });

  it("Register User Account", (done) => {
    request(app)
      .post('/identity/register')
      .set('X-Authub-Account', masterAccount.name)
      .set("Authorization", "Bearer " + masterClientJwtToken.access_token )
      .send({
          name: "aivics",
          fullname: "猎户座网络科技有限公司",
          username: 'aivics_admin',
          password: 'abc123456',
          mobile: '18621661799',
          email: 'lei.he@aivics.com',
          lastName: 'HE',
          firstName: 'LEI'
      })
      .expect(201)
      .expect(function(res){
        if( res.body.success !== true )  throw new Error("request_failed");
        if( res.body.name !== "aivics" ) throw new Error("incorrect_account_name");
      })
      .end(function(err, res){
        if(err) return done(err);

        done();
      });
  })

  var veri_code;
  var vericode_token;


  it("成功获得Verification Code", (done) => {
    var data = { identity: 'lei.he@aivics.com' , veri_type: 'email', target_url: "/accounts/activate" };
    request(app)
      .post('/identity/vericode/code')
      .send( data )
      .expect(201)
      .expect(function(res){
        veri_code = res.body.veri_code;
        console.log("code: ", veri_code);
        if( res.body.success !== true ) throw new Error('invalid_response');
        if( process.env.NODE_ENV === 'development' && !res.body.veri_code )
          throw new Error('invalid_code_returned');
      })
      .end(function(err, res){
        if(err) return done(err);

        done();
      });
  });

  it('通过CODE成功换取TOKEN', (done) => {
    var data = { identity: 'lei.he@aivics.com', veri_code: veri_code };
    request(app)
      .post('/identity/vericode/validate')
      .send( data )
      .expect(201)
      .end(function(err, res){
        if (err) return done(err);
        vericode_token = res.body.vericode_token;
        console.log(vericode_token);
        done();
      });
  });

  it("成功激活Admin Account", (done) => {
    request(app)
      .get('/identity/accounts/activate')
      .set('X-Authub-Account', accountName)
      .send({ vericode_token: vericode_token })
      .expect(200)
      .end(function(err, res){
        if(err) return done(err);
        done();
      });
  });

  it("应该成功通过新注册的账号的Admin用户名和密码换取AccessToken", (done) => {
    request(app)
      .post('/identity/oauth2admin/token')
      .set('X-Authub-Account', "aivics")
      .send({
          username: 'aivics_admin',
          password: 'abc123456',
          grant_type: 'password'
      })
      .expect(function(res){
        if(!res.body.access_token) throw new Error("no access token retrieved")
        jwtToken = res.body;
      })
      .end(function(err, res){
        if(err) return done(err);
        done();
      });
  })

  it("通过账号密码换得的RefreshToken换取新的AccessToken", (done) => {
    request(app)
      .post('/identity/oauth2admin/token')
      .set('X-Authub-Account', "aivics")
      .send({
        refresh_token: jwtToken.refresh_token,
        grant_type: 'refresh_token'
      })
      .expect(200)
      .end(function(err, res){
        if(err) return done(err);

        if(!res.body.access_token) return done(new Error("failed to get access token"));

        jwtToken = res.body;
        done()
      });
  })

  it("Account名称不匹配，则不能通过RefreshToken换取新的AccessToken", (done) => {
    request(app)
      .post('/identity/oauth2admin/token')
      .set('X-Authub-Account', "authub_master")
      .send({
        refresh_token: jwtToken.refresh_token,
        grant_type: 'refresh_token'
      })
      .expect(403)
      .end(done);
  })

  // var newClient;
  //

  //
  // it("通过新建的客户Client可以获得AccessToken", function(done){
  //   var data = {
  //     client_id: newClient._id,
  //     client_secret: newClient.clearText,
  //     grant_type: 'client_credential'
  //   }
  //   request(app)
  //     .post('/identity/oauth2/token')
  //     .set('X-Authub-Account', "aivics")
  //     .send(data)
  //     .expect(200)
  //     .end(function(err, res){
  //       if (err) {
  //         return done(err);
  //       }
  //
  //       console.log(res.body);
  //       jwtToken = res.body;
  //
  //       done();
  //     });
  // });


  it("通过Admin账号可以创建新用户", function(done){
    request(app)
      .post('/identity/users')
      .set('X-Authub-Account', "aivics")
      .set("Authorization", "Bearer " + jwtToken.access_token )
      .send({
        username: 'ehe8888',
        password: '123456',
        mobile: '13764211365',
        email: 'lei.he@aivics.com',
        staff: 'S001',
        firstName: 'Lei',
        lastName: 'He'
      })
      .expect(201)
      .end(function(err, res){
        if(err) return done(err);
        if("ehe8888" !== res.body.data.username) return done(new Error("username not correct"))
        done();
      });
  })

  it("获得激活新用户的CODE", function(done){
    var data = { identity: 'lei.he@aivics.com' , veri_type: 'email', target_url: "/users/activate" };
    request(app)
      .post('/identity/vericode/code')
      .send( data )
      .expect(201)
      .expect(function(res){
        veri_code = res.body.veri_code;
        console.log("code: ", veri_code);
        if( res.body.success !== true ) throw new Error('invalid_response');
        if( process.env.NODE_ENV === 'development' && !res.body.veri_code ) throw new Error('invalid_code_returned');
      })
      .end(done);
  });

  it('通过CODE成功换取激活新用户的TOKEN', function(done){
    var data = { identity: 'lei.he@aivics.com', veri_code: veri_code };
    request(app)
      .post('/identity/vericode/validate')
      .send( data )
      .expect(201)
      .end(function(err, res){
        if (err) return done(err);
        vericode_token = res.body.vericode_token;
        console.log(vericode_token);
        done();
      });
  });

  it("成功激活普通用户User Account", function(done){
    request(app)
      .get('/identity/users/activate')
      .set('X-Authub-Account', accountName)
      .send({ vericode_token: vericode_token })
      .expect(200)
      .end(function(err, res){
        console.error(err);
        done(err);
      });
  });

  it("通过新用户的用户名和密码可以等到用户的AccessToken", function(done){
    request(app)
      .post('/identity/oauth2/token')
      .set('X-Authub-Account', "aivics")
      .send({
          username: 'ehe8888',
          password: '123456',
          grant_type: 'password'
      })
      .expect(200)
      .expect(function(res){
        expect(res.body.access_token).to.exist;
        jwtToken = res.body;
      })
      .end(done);
  })

  it("重设密码", function(done){
    request(app)
      .post('/identity/users/reset_password')
      .set('X-Authub-Account', "aivics")
      .set('Authorization', "Bearer " + jwtToken.access_token)
      .send({
          old_password: '123456',
          new_password: 'Abc123456'
      })
      .expect(200)
      .expect(function(res){
        expect(res.body.success).to.be.true;

        request(app)
          .post('/identity/oauth2/token')
          .set('X-Authub-Account', "aivics")
          .send({
              username: 'ehe8888',
              password: 'Abc123456',
              grant_type: 'password'
          })
          .expect(200)
          .expect(function(res){
            console.log(res.body)
            expect(res.body.access_token).to.exist;
            jwtToken = res.body;
          })
          .end(done);
      })
      .end(function(err){
        console.log("complete")
      });
  })

  it("通过MasterClientToken可以得到某个账号的Config配置信息", function(done){

    request(app)
      .get('/identity/accounts/config')
      .set('X-Authub-Account', "authub_master")
      .set("Authorization", "Bearer " + masterClientJwtToken.access_token )
      .query({
        account: "aivics"
      })
      .expect(200)
      .expect(function(res){
        console.log(res.body);
        expect(res.body.data.accessToken).to.exist;
      })
      .end(done);

  });
});
