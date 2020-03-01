const { logger } = require('./lib/logger');

const {
  startQueueWorkers, stopQueueWorkers,
} = require('./lib/queue');

// queues are "registered" in run-init

async function start() {
  await startQueueWorkers();
  logger.log('App starting QUEUE');
}

async function stop() {
  // TODO tell the workers to shut down
  await stopQueueWorkers();
}

module.exports = {
  start, stop,
};
