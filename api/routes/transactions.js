const _ = require('lodash');
const async = require('async');

const { Models } = require('../models');
const { validate } = require('../lib/validation-helpers');

module.exports = function initRoutes(router) {
  router.get('/transactions', async (ctx, next) => {
    validate(ctx.request.query, {
    }, { discardExtraProps: true });

    const loans = await Models.Transaction.findAll({
      order: [['timestamp', 'desc']],
    });
    ctx.body = loans;
  });

  router.param('txHash', async (txHash, ctx, next) => {
    ctx.$.tx = await Models.Transaction.findByPk(ctx.params.txHash);
    if (!ctx.$.tx) ctx.throw('NotFound', 'Flash loan transaction not found');

    _.assign(ctx.$, await ctx.$.tx.populateRefs('reserveToken logs'));

    await async.each(ctx.$.logs, async (log) => await log.populateRefs('contract src dst'));

    return next();
  });

  router.get('/transactions/:txHash', async (ctx, next) => {
    ctx.body = ctx.$.tx;
  });
};
