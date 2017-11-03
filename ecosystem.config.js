// ecosystem.config.js

const SUFFIX = process.argv.indexOf('--env') === -1 ? '' :
      '-' + process.argv[process.argv.indexOf('--env') + 1];
module.export = {
  "apps" : [
    {
      "name"      : "ccmauth" + SUFFIX,
      "script"    : "./bin/www",
      "watch" : false,
      "error_file"      : "/var/log/pm2/ccm_auth/1.0/err.log",
      "out_file"        : "/var/log/pm2/ccm_auth/1.0/out.log",
      "merge_logs"      : true,
      "log_date_format" : "YYYY-MM-DD HH:mm Z",
      "env": {

      },
      "env_production" : {
        "NODE_ENV": "production",
        "PORT": 10241
      },
      "env_staging" : {
        "NODE_ENV": "staging",
        "PORT": 10242
      },
      "env_test" : {
        "NODE_ENV": "test",
        "PORT": 6000
      }
    }
  ],

  "deploy" : {
    "production" : {
      "user" : "root",
      "host" : "ccmauth.fastccm.net",
      "ref"  : "origin/1.0",
      "repo" : "https://github.com/ehe888/ccm_authub.git",
      "path" : "/srv/ccm_authub/production",
      "post-deploy" : "npm install && pm2 startOrRestart ecosystem.config.js --env production"
    },
    "staging" : {
      "user" : "root",
      "host" : "ccmauth.fastccm.net",
      "ref"  : "origin/master",
      "repo" : "https://github.com/ehe888/ccm_authub.git",
      "path" : "/srv/ccm_authub/staging",
      "post-deploy" : "npm install && pm2 startOrRestart ecosystem.config.js --env staging"
    },
    "test" : {
      "user" : "root",
      "host" : "ccmauth.aivics.net",
      "ref"  : "origin/master",
      "repo" : "https://github.com/ehe888/ccm_authub.git",
      "path" : "/srv/ccm_authub/test",
      "post-deploy" : "npm install && pm2 startOrRestart ecosystem.config.js --env test"
    }
  }
}
