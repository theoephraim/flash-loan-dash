const fs = require('fs');
const _ = require('lodash');
const nconf = require('nconf');
const requireDirectory = require('require-directory');
const Queue = require('bull');
const uuidv4 = require('uuid/v4');
const Arena = require('bull-arena');
const basicAuth = require('koa-basic-auth');

const async = require('async');
const { logger } = require('./logger');
const { ApiError } = require('./better-ctx-throw');

// TODO: figure out a way so this module does not have to know about the test queue
// setting it up was too hard because of circular requires
// const testQueue = require('../tests/helpers/test-queue');

const REDIS_URL = nconf.get('REDIS:url');
const DO_CERT_CA = fs.readFileSync(`${__dirname}/../config/do-ca-certificate.crt`);
const TEST_MODE = nconf.get('NODE_ENV') === 'test';
const ENQUEUE_DEFAULTS = {
  attempts: 5,
  timeout: 5 * 60 * 1000, // 5 minutes
};
const WORKER_DEFAULTS = {
  concurrency: 5,
  timeout: (ENQUEUE_DEFAULTS.timeout * 1000) + (10 * 1000),
};

const IOREDIS_CONFIG = {
  host: nconf.get('REDIS:host'),
  port: nconf.get('REDIS:port'),
  password: nconf.get('REDIS:password'),
  // have to enable TLS for DO -- https://github.com/luin/ioredis/issues/689
  ...nconf.get('REDIS:tls') && { tls: {} },
};

const registeredQueues = {};


// initialize queues - this does not start them, just registers them
// so that we can catch a bad queue / job while enqueueing
function registerAllQueues() {
  _.each(requireDirectory(module, '../queues'), (config) => {
    const { queueName, jobTypes } = config;
    registeredQueues[queueName] = config;

    registeredQueues[queueName].queue = new Queue(queueName, {
      // limiter: { max, duration },
      // prefix?: string = 'bull'; // prefix for all queue keys.
      defaultJobOptions: {},
      redis: IOREDIS_CONFIG,
    });
  });
}

async function initCronJobsForQueue(queueConfig, removeExisting = false) {
  if (removeExisting) {
    const repeatableJobs = await queueConfig.queue.getRepeatableJobs();
    async.each(repeatableJobs, async (repeatingJob) => {
      if (repeatingJob.cron) {
        console.log('removing cron job', repeatingJob);
        await queueConfig.queue.removeRepeatable(repeatingJob.name, { cron: repeatingJob.cron });
      }
    });
  }

  await async.eachSeries(_.keys(queueConfig.cron), async (jobName) => {
    const schedule = queueConfig.cron[jobName];
    return queueConfig.queue.add(jobName, {}, { repeat: { cron: schedule } });
  });
}
// called from utils route to reset all cronjobs
async function resetCronJobs() {
  await async.each(registeredQueues, async (q) => initCronJobsForQueue(q, true));
}

// need to be careful here - any errors in this code will look like job failures
async function generalJobHandler(jobInstance) {
  const jobOptions = jobInstance.opts;
  const queueName = jobInstance.queue.name;
  const jobName = jobInstance.name;

  // console.log(jobInstance);

  const jobCtx = {};
  try {
    // here we set this up to more mirror how koa works so the route handlers are more similar
    // by passing through a `ctx` object to the handler
    // that holds the info about the job and a logger fn
    jobCtx.metadata = jobInstance;
    jobCtx.payload = jobInstance.data;
    jobCtx.state = {
      requestStart: +new Date(),
      requestId: uuidv4(),
    };
    jobCtx.$ = jobCtx.state; // just to mirror our koa setup
    jobCtx.result = {};
    jobCtx.logContext = {};
    // re-using our existing ApiError so it's more similar to our route handlers
    jobCtx.throw = (...args) => { throw new ApiError(...args); };
    jobCtx.throwAndDie = (...args) => {
      const errToThrow = new ApiError(...args);
      errToThrow.noRetry = true;
      throw errToThrow;
    };

    const jobInfo = {
      queueName,
      jobName,
      createdAt: new Date(jobInstance.timestamp),
      enqueuedAt: new Date(jobInstance.processedOn),
      jobId: jobInstance.id,
    };

    // be careful here - any logging error will look like job failures
    jobCtx.log = (message, meta) => {
      if (!_.isString(message)) throw new Error('Missing log message');
      const toLog = {
        type: 'queue',
        ...jobInfo,
        context: jobCtx.logContext,
        ...meta,
      };
      logger.log(message, toLog);
    };


    // actually perform the job -- errors will be caught
    await registeredQueues[queueName].jobTypes[jobName](jobCtx);
  } catch (err) {
    jobCtx.$.capturedError = err;
  }

  const err = jobCtx.$.capturedError;

  const jobTimer = new Date() - jobCtx.$.requestStart;
  // we use an http response code here as it helps signal what happened
  const statusCode = err ? (err.statusCode || 500) : 200;

  jobCtx.log(`QUEUE ${queueName}/${jobName} ${statusCode} ${jobTimer}ms`, {
    timer: jobTimer,
    result: jobCtx.result, // this is set in the specific job handler
    statusCode,
    ...err && {
      error: err,
      jobWillRetry: !err.noRetry,
    },
  });

  if (err) {
    // do not re-attempt, even if attemptsMade is less than job.attempts
    if (err.noRetry) jobInstance.discard();
    throw err; // this will log the error and (usually) enqueue the job to be retried
  }
}


function getJobHandler(queueName, jobName) {
  // if (!queues) autoLoadQueues();
  if (!registeredQueues[queueName]) {
    throw new Error(`Invalid queueName - "${queueName}"`);
  } else if (!registeredQueues[queueName].jobTypes[jobName]) {
    throw new Error(`Invalid jobType - "${queueName}/${jobName}"`);
  }
  return registeredQueues[queueName].jobTypes[jobName];
}

async function stopQueueWorkers() {
  // FIXME: worker shutdown
}


async function startQueueWorkers() {
  await async.each(registeredQueues, async (q) => {
    // we use a single processor for all job types to combine the concurrency level
    // TODO: maybe change this?

    // This actually starts the workers running
    q.queue.process('*', q.concurrency || WORKER_DEFAULTS.concurrency, generalJobHandler);
    q.queue.on('error', (error) => {
      logger.log('QUEUE ERROR', { error });
    });

    // start scheduled/cron jobs
    if (q.cron) await initCronJobsForQueue(q);
  });
}

async function enqueueJob(queueName, jobName, payload, _options = {}) {
  // throws an error if not found
  const jobDefinition = getJobHandler(queueName, jobName);

  // OPTIONS
  // - attempts (int) - number of attempts (default=5)
  // - delay (int) - how long to wait in ms (optional)
  // - priority(int) - 1 = highest (optional)
  // - lifo (bool) - put in front of queue (optional)

  // TODD: maybe set defaults per job or queue?
  const options = {
    ...ENQUEUE_DEFAULTS,
    ..._options,
  };


  // when NODE_ENV == 'test' jobs are put into a mock queue where we can just check
  // if they were enqueued. To test queues we trigger the jobs directly.
  // if (TEST_MODE) {
  //   testQueue.addJob(queueName, jobName, payload, options);
  //   return null;
  // }

  return registeredQueues[queueName].queue.add(jobName, payload, options);
}

// function to run a queue job directly instead of enqueueing into redis
// probably mostly useful for scripts, not really in API routes
async function runQueueJobDirectly(queueName, jobName, payload, ctx) {
  const jobCtx = {
    log: ctx ? ctx.log : logger.log,
    payload,
    result: {},
    logContext: {},
    metadata: { jid: `${queueName}-${jobName}-run-outside-faktory` },
    throw: (...args) => { throw new ApiError(...args); },
    throwAndDie: (...args) => {
      const errToThrow = new ApiError(...args);
      errToThrow.noRetry = true;
      throw errToThrow;
    },
  };
  const jobFn = getJobHandler(queueName, jobName);
  await jobFn(jobCtx);
  return jobCtx.result;
}

function initializeAdminTool(app) {
  const arena = Arena({
    queues: _.map(registeredQueues, (q) => ({
      name: q.queueName,
      hostId: 'prod', // host display name, give it a helpful name for reference
      prefix: 'bull', // redis key prefix (bull is default)
      redis: IOREDIS_CONFIG,
    })),
  }, {
    basePath: '/qadmin',
    disableListen: true, // do not start listening
    useCdn: true,
  });

  // this middleware runs before anything else
  app.use((ctx, next) => {
    // skip everything if not a request for the bull arena
    if (ctx.request.url !== '/qadmin' && !ctx.request.url.startsWith('/qadmin/')) return next();

    return basicAuth({ user: '', pass: nconf.get('BULL:pass') })(ctx, () => {
      ctx.status = 200;
      ctx.respond = false;
      arena(ctx.req, ctx.res);
    });
  });
}


module.exports = {
  getJobHandler,
  registerAllQueues,
  startQueueWorkers,
  stopQueueWorkers,
  enqueueJob,
  runQueueJobDirectly,
  resetCronJobs,
  initializeAdminTool,
};
