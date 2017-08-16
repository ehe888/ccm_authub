
describe("普通账号的管理员账号", function(){

  var jwtToken;

  it("应该成功通过管理员账号和密码换取AccessToken", function(done){
    request(app)
      .post('/identity/oauth2admin/token')
      .set('X-Authub-Account', "authub_master")
      .send({
          username: 'aivics_admin',
          password: 'abc123456',
          grant_type: 'password'
      })
      .expect(200)
      .expect(function(res){
        expect(res.body.access_token).to.exist;
        jwtToken = res.body;
      })
      .end(done);
  })



  it("通过普通账号的Admin账号可以创建新Client", function(done){
    request(app)
      .post('/identity/clients')
      .set('X-Authub-Account', "aivics")
      .set("Authorization", "Bearer " + jwtToken.access_token )
      .send({})
      .expect(201)
      .expect(function(res){
        expect(res.body.data).to.exist;
        expect(res.body.data.account.name).to.equal("aivics");
        var newClient = res.body;
        console.log(newClient);

      })
      .end(done);
  })

  it("Admin账号重置密码", function(done){
    request(app)
      .post('/identity/users/reset_password')
      .set('X-Authub-Account', "aivics")
      .set('Authorization', "Bearer " + jwtToken.access_token)
      .send({
          username: 'ehe8888',
          new_password: '123456',
          isAdmin: true,
      })
      .expect(200)
      .expect(function(res){
        if(!res.body.success) throw new Error("failed to reset password");

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
            if(!res.body.access_token) throw new Error("failed to get token");
            jwtToken = res.body;
          });
      })
      .end(function(err){
        if(err) return done(err);

        done()
      });
  })
})
