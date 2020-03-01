const nconf = require('nconf');

process.env.TZ = 'UTC';

// initialize config -- all stored in nconf
require('../config/init-config');

const { logger } = require('./logger');

// handle unhandled promise rejection
process.on('unhandledRejection', (error, promise) => {
  logger.log('UNHANDLED PROMISE REJECTION', { error });
});

process.on('multipleResolves', (type, promise, reason) => {
  console.log('MULTIPLE RESOLVES', type, promise, reason);
  // logger.log('MULTIPLE RESOLVES', { error });
});
process.on('rejectionHandled', (promise) => {
  console.log('REJECTION HANDLED', promise);
  // logger.log('REJECTION HANDLED', { error });
});


// explicitly exit on signal while running dev
// this is needed to help exit out of our npm run tasks that watch+lint+restart/test
if (process.env.NODE_ENV !== 'production') {
  ['SIGTERM', 'SIGINT'].forEach((signal) => {
    process.on(signal, () => process.exit(0));
  });
}


// initiate DB connection and load models
require('../models');
