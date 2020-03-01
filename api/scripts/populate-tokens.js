require('../lib/run-init');

const _ = require('lodash');
const nconf = require('nconf');
const async = require('async');
const requireDirectory = require('require-directory');

const { dbReady, Models, Op } = require('../models');

(async function main() {
  await dbReady;

  // await Models.FlashLoan.destroy({ where: {} });

  const tokens = requireDirectory(module, '../tokens/eth');

  async.eachSeries(tokens, async (token) => {
    await Models.Contract.upsert({
      address: token.address.toLowerCase(),
      name: token.name,
      website: token.website || null,
      type: 'token',
      tokenSymbol: token.symbol,
      tokenDecimals: token.decimals,
      details: token,
    });
  });
}());
