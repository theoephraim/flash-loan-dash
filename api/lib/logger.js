/* eslint-disable consistent-return,no-console */

const nconf = require('nconf');
const _ = require('lodash');
// const LogDNA = require('logdna');
const uuidv4 = require('uuid/v4');
// const Raven = require('raven');

const { recursivelyGetVersionedJSON } = require('./orm-wrap/versioned-serializer');

// const SENTRY_ENABLED = !!nconf.get('SENTRY:dsn');
// if (SENTRY_ENABLED) {
//   Raven.config(nconf.get('SENTRY:dsn')).install();
// }

const LOG_TO_CONSOLE = true;

// let logdna;
// if (nconf.get('LOGDNA:api_key')) {
//   logdna = LogDNA.createLogger(nconf.get('LOGDNA:api_key'), {
//     app: nconf.get('APP_NAME'),
//     env: nconf.get('LEADEREQ_ENV'),
//     index_meta: true,
//     // tags: ['array', 'of', 'tags'],
//   });
// }

/*
This function should be used only in libs and `ctx.log` functions!
This function should _not_ be used in routes or queues!

`meta` is one of:
- an object with the following values
  - `error`
  - `type`; should be `'queue'` or `'request'` if called from a queue or request respectively
  - `timer`

Information on `meta` is processed to:
- log `message` (and `error.name` if present)
- log as an error if `meta.error` is truthy, otherwise `info`
- set a `meta.subtype` if `meta.type` is `'request'` or '`queue'`
  - `'complete'` if `meta.timer` is truthy, else `'detail'`
- limit `meta.error` to certain fields
- log this transformed `meta`
- forward true errors to Sentry via Raven
  - true errors pass `_.isError(meta.error) && !meta.error.expectedError`
*/
function log(message, meta = {}) {
  if (!_.isString(message)) throw new Error('Missing log message');
  if (meta.id) throw new Error('Do not set ID in data to log!');

  const { error } = meta;

  // // figure out subtype -- error, middle of request, request finished, etc
  // if (meta.type === 'queue' || meta.type === 'request') {
  //   meta.subtype = meta.timer ? 'complete' : 'detail';
  // } else {
  //   meta.type = meta.type || 'general';
  // }

  if (error) {
    meta.message += ` - ${error.name}`;
    // replace the raw error with something better for logging
    meta.error = _.pick(error, [
      'name', 'generalType', 'message', 'details', 'stack',
    ]);

    // check if the error is something that look like an http request and include the response
    // and we want to expose the response body
    if (error.response) meta.error.responseBody = JSON.stringify(error.response.body);
  }

  if (nconf.get('NODE_ENV') === 'test' && !nconf.get('TEST_LOGS')) return;

  if (LOG_TO_CONSOLE) {
    if (meta.statusCode === 200) {
      console.log(message);
      console.log(meta);
    } else console.log(message, meta);
  }

  // This will serialize our models if they were passed in, and will error on any recursive JSON
  // TODO: catch this error and do something about it? or just log [json too deep] or something
  const trimmedMeta = recursivelyGetVersionedJSON(meta);

  // log to LogDNA
  // if (logdna) {
  //   logdna.log(message, {
  //     level: error ? 'ERROR' : 'INFO',
  //     meta: {
  //       type: 'general',
  //       ...trimmedMeta,
  //     },
  //   });
  // }

  // only "true" errors get passed through to sentry
  if (error && _.isError(error) && !error.expectedError) {
    console.log('------ EXCEPTION ------');
    console.log(error);
    console.log('-----------------------');

    // if (SENTRY_ENABLED) {
    //   Raven.context(() => {
    //     Raven.setContext({
    //       request: _.pick(meta, 'url', 'method'),
    //       user: meta.user,
    //       extra: _.omit(meta, 'error', 'user', 'url', 'method'),
    //     });
    //     // make sure we expose the response body to sentry
    //     if (error.response) error.responseBody = error.response.body;
    //     Raven.captureException(error);
    //   });
    // }
  }
}

async function flush() {
  // await promisify(LogDNA.flushAll);
}

// Koa request middleware to set up ctx.log()
// ctx.log adds info about the request to logs along with your message/data
// and it also logs the request after the request has finished (using ctx.log)
async function httpRequestLoggingMiddleware(ctx, next) {
  const { req, res } = ctx;

  // skip logs for favicon, which the browser sometimes hits automatically
  if (req.url === '/favicon.ico') return next();

  ctx.$.requestStart = +new Date();
  ctx.$.requestId = uuidv4();

  const requestInfo = {
    type: 'request',
    url: req.url,
    method: req.method,
    requestId: ctx.$.requestId,
    userAgent: req.headers['user-agent'],
    remoteIp: ctx.ip,
  };

  // set up general "ctx.logContext" object to add any context info about the request
  ctx.logContext = {};

  ctx.log = (message, meta) => {
    // set the api version -- we dont have this info earlier because that middleware didnt run yet
    requestInfo.apiVersion = ctx.$.version;
    // not sure about this
    if (req.originalUrl) requestInfo.originalUrl = ctx.req.originalUrl;

    log(message, {
      ...requestInfo,
      ...ctx.$.authUser && ctx.$.authUser.id && {
        user: _.pick(ctx.$.authUser, 'id', 'type', 'email'),
      },
      context: ctx.logContext,
      ...meta,
    });
  };


  await next(); // pass control back to Koa and process the actual request

  const requestTime = +new Date() - ctx.$.requestStart;

  let logRequest = true;
  // TODO: maybe other logs to skip?
  // skip logging the health checks from DO load balancer
  if (req.url === '/' && !req.headers['user-agent']) logRequest = false;

  if (!logRequest) return;

  // TODO: add some colors to the status code and request time?
  ctx.log(`${requestInfo.method} ${requestInfo.url} ${res.statusCode} ${requestTime}ms`, {
    timer: requestTime,
    statusCode: res.statusCode,
    error: ctx.$.capturedError,
  });
}

module.exports = {
  httpRequestLoggingMiddleware,
  logger: { log, flush },
};
