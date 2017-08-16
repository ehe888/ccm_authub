const path = require('path');
const env = process.env.NODE_ENV; /* development, test, production in different file */
const config = require(path.join(__dirname, '.', 'config.' + (env || 'development') + '.json'));

module.exports = config;
