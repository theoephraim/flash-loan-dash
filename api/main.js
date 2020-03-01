/* eslint-disable no-console */

// if (process.env.EATWAVE_ENV === 'production') {
//   // set newrelic config path
//   process.env.NEW_RELIC_HOME = __dirname + '/config';
//   // include new relic tracking
//   require('newrelic');
// }

// run init - set up config files
require('./lib/run-init');

// include modules
const _ = require('lodash');
const nconf = require('nconf');

const { logger } = require('./lib/logger');

const { dbReady } = require('./models');

// in cluster mode, there can be several node processes
// const PROCESS_ID = (nconf.get('NODE_APP_INSTANCE') || 0).toString();

async function boot() {
  // Possible run "modes" are: API, QUEUE
  // RUN_MODES is comma-separated string
  let runModes = nconf.get('RUN_MODES');
  if (typeof runModes === 'string') {
    runModes = runModes.split(',');
  }

  await dbReady;

  // run API server
  if (_.includes(runModes, 'API')) {
    try {
      await require('./api').start(); // eslint-disable-line global-require
    } catch (error) {
      logger.log('Error starting up API app', { error });
    }
  }

  // // run queue system
  // if (_.includes(runModes, 'QUEUE')) {
  //   try {
  //     await require('./queue').start(); // eslint-disable-line global-require
  //   } catch (error) {
  //     logger.log('Error starting up QUEUE app', { error });
  //   }
  // }
}

// throw the uncaught exception in the next tick so that it is not treated
// as an unhandled promise rejection
boot().catch((err) => { setImmediate(() => { throw err; }); });
