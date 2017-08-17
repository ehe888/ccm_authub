//Logger
const env = process.env.NODE_ENV;
const config = require('./config');

const winston = require('winston');

winston.level = process.env.LOG_LEVEL || config.log.level || 'error';

module.exports = winston;
