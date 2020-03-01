const _ = require('lodash');
const nconf = require('nconf');

const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const promiseDelay = require('promise-delay');
const cors = require('@koa/cors');

const { httpRequestLoggingMiddleware, logger } = require('./lib/logger');
const betterCtxThrow = require('./lib/better-ctx-throw').middleware;
// const setRequestVersion = require('./lib/version-helpers').middleware;
const serializeResponse = require('./lib/orm-wrap/versioned-serializer').middleware;
// const {
//   middleware: authMiddleware,
//   passwordProtectedMiddleware,
// } = require('./lib/auth-helpers');
// const { initializeAdminTool: initQueueAdmin } = require('./lib/queue');
const router = require('./routes');

// create the web app
const app = new Koa();
const port = nconf.get('PORT');

// initQueueAdmin(app);

// tells koa to use  X-Forwarded-For - https://github.com/koajs/koa/issues/599
app.proxy = true;

// Set up middlewares
app.use(cors({ exposeHeaders: ['x-total-count'] }));
app.use((ctx, next) => { ctx.$ = ctx.state || {}; return next(); });
app.use(httpRequestLoggingMiddleware);
app.use(betterCtxThrow);
app.use(bodyParser());
app.use((ctx, next) => {
  _.each(ctx.request.query, (val, key) => {
    if (key.endsWith('[]')) {
      ctx.request.query[key.slice(0, -2)] = val;
      delete ctx.request.query[key];
    }
  });

  return next();
});

// add artificial delay during local dev - helpful for front-end development
if (nconf.get('NODE_ENV') === 'development' && nconf.get('RESPONSE_DELAY')) {
  app.use(async (ctx, next) => {
    await next();
    await promiseDelay(nconf.get('RESPONSE_DELAY'));
  });
}
// app.use(setRequestVersion);
app.use(serializeResponse);
// app.use(authMiddleware);
// app.use(passwordProtectedMiddleware);
app.use(router.routes());


// if no matching routes exist, we reach this middleware
app.use(async (ctx, next) => {
  ctx.throw('NotFound', 'Invalid URL');
});

async function start() {
  await app.listen(port);
  logger.log(`App starting API - listening on port ${port}`);
}


module.exports = {
  app,
  start,
};
