"use strict"

const randomstring 	= require("randomstring");
const dbHost = process.env.MONGO_HOST || 'localhost';

const dbOptions = {
    server: `mongodb://${dbHost}/`,
    masterDb: 'authub_master'
};

const dbs = require('../../lib/models')(dbOptions);


// app.use(cookieParser());
// app.use(bodyParser());
//
// let identity = express();
// app.use("/identity", identity);

// require("../../lib")(identity, {
//   mongodb: { db: dbOptions.masterDb },
// });

const app = require('../../app');

exports.app = app;
exports.dbs = dbs;
exports.dbOptions = dbOptions;

exports.masterAccount = {
  name: 'authub_master',
  username: 'admin',
  password: 'abc123456',
  mobile: '13764211365',
  email: 'lei.he@fastccm.com',
  fullname: "上海希希麦科技有限公司",
  lastName: "何",
  activated: true,
  accessToken: {
    secret: randomstring.generate(32)
  },
  refreshToken: {
    secret: randomstring.generate(64)
  }
};

exports.masterClient = {
  name: "Master Acount Client",
  secret: randomstring.generate(32),
  scope: [ 'register' ]
}

exports.testAccount = {
    name: "aivics",
    fullname: "猎户座网络科技有限公司",
    username: 'aivics_admin',
    password: 'abc123456',
    mobile: '18621661799',
    email: 'lei.he@aivics.com',
    lastName: 'HE',
    firstName: 'LEI'
}
