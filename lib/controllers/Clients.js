"use strict"

module.exports = function(app, settings){
	var debug 		= require('debug')('authub')
		, express 	= require('express')
		, util 			= require('util')
		, url 			= require('url');

	var router 		= express.Router();
	var dbs 			= app.locals.dbs;

  /**
   * Create an client - need multi factor authentication
   */
  router.post("/", function(req, res, next){
    let account = res.locals.account.name;
    dbs.connect(account, function(err, db){
      if(err){
        logger.error(err);
        return res.status(500);
      }

      db.model('Client')
        .generateClientAsync(account)
        .then(function(client){
          return res.status(201).json({
            success: true,
            data: client
          });
        })
        .catch(function(err){
          if(err){
            logger.error(err);
            return res.status(500);
          }
          return res.status(200);
        });
    });

  });

	app.use('/clients', router);
}
