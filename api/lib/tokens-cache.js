const _ = require('lodash');
const { Models, dbReady } = require('../models');

const tokensByAddress = {};

dbReady.then(() => {
  reloadTokens();
});

async function reloadTokens() {
  const allTokens = await Models.Contract.findAll({ where: { type: 'token' } });
  _.assign(tokensByAddress, _.keyBy(allTokens, 'address'));
}

module.exports = { tokensByAddress };
