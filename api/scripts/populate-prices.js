// Populate ABIs of contracts that are referenced in the transaction logs

require('../lib/run-init');

const _ = require('lodash');
const nconf = require('nconf');
const async = require('async');

const {
  dbReady, Models, Op, selectQuery,
} = require('../models');
const amberdata = require('../lib/amberdata');

(async function main() {
  await dbReady;

  // find all contract addresses which created logs
  const contractsFromLogs = await selectQuery(`
    WITH
      tl AS (SELECT DISTINCT(contract_address) FROM transaction_logs WHERE type='token_transfer')
    SELECT
      tl.contract_address, c.name, c.type
    FROM
      tl
      INNER JOIN contracts c ON tl.contract_address = c.address AND c.type='token'
  `);


  // async.eachSeries(contractsFromLogs.slice(0, 1), async ({ contract_address }) => {
  async.eachSeries([{ contract_address: '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5' }], async ({ contract_address }) => {
    const contract = await Models.Contract.findByPk(contract_address);
    console.log(contract.tokenSymbol, contract.address);
    console.log('-------------------------');
    const pricing = await amberdata.getTokenPriceHistory(contract.details.address);
    console.log(pricing);
  });
}());
