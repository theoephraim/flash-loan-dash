// Populate ABIs of contracts that are referenced in the transaction logs

require('../lib/run-init');

const _ = require('lodash');
const nconf = require('nconf');
const async = require('async');
const BigNumber = require('bignumber.js');

const {
  dbReady, Models, Op, selectQuery,
} = require('../models');
const etherscan = require('../lib/etherscan');

(async function main() {
  await dbReady;

  const txs = await Models.Transaction.findAll({
    where: {
      // txHash: '0x1cc56ffe7344bb96cee7ec509ffe8445b076634f232a7b46c31f6cada18532bf',
    },
  });

  // async.eachSeries(txs.slice(0, 1), async (tx) => {
  async.eachSeries(txs.slice(), async (tx) => {
    console.log(`\n\nTX = ${tx.txHash}`, tx.loanAmount.toFixed());
    console.log('---------------------------');
    const logs = await tx.populateRef('logs');
    async.eachSeries(logs.slice(), async (log) => {
      log.refs.tx = tx;
      console.log(`\n\n> log #${log.logIndex}`);
      await log.decode();
    });
  });
}());
