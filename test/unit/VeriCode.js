// VeriCode Model Unit test

const { should, expect }  = require('chai');

const dbs = require("./env").dbs;

const identity = 'lei.he@aivics.com';
const targetUrl = 'http://localhost/activate';


describe('VeriCode', () => {
  it('Generate', (done) => {
    dbs.connectToMaster((err, db) => {
      db.model('VeriCode')
        .generate(identity, 10, targetUrl, (err, code) => {
          if(err) return done(err);

          expect(code).to.exist;
          expect(code.length).to.equal(4);
          done();
        });
    })
  })

  it('generate duplicate', (done) => {
    dbs.connectToMaster((err, db) => {
      db.model('VeriCode')
        .generate(identity, 10, targetUrl, (err, code) => {
          if(err) return done(err);

          expect(code).to.exist;
          expect(code.length).to.equal(4);
          done();
        })
    })
  })

  it('validate', (done) => {
    dbs.connectToMaster((err, db) => {
      db.model('VeriCode')
        .generate(identity, 10, targetUrl, (err, code) => {
          if(err) return done(err);

          db.model('VeriCode')
            .validate(identity, code, (err, random, targetUrl2) => {
              if(err) return done(err);
              expect(targetUrl2).to.equal(targetUrl);
              done();
            })
        })
    })
  })
});
