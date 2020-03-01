// Populate ABIs of contracts that are referenced in the transaction logs

require('../lib/run-init');

const _ = require('lodash');
const nconf = require('nconf');
const async = require('async');

const {
  dbReady, Models, Op, selectQuery,
} = require('../models');
const etherscan = require('../lib/etherscan');

(async function main() {
  await dbReady;

  // find all contract addresses which created logs
  const contractsFromLogs = await selectQuery(`
    WITH
      tl AS (SELECT DISTINCT(contract_address) FROM transaction_logs)
    SELECT
      tl.contract_address, c.name, c.type
    FROM
      tl
      LEFT JOIN contracts c ON tl.contract_address = c.address
  `);

  async.eachSeries(contractsFromLogs, async ({ contract_address }) => {
    let contract = await Models.Contract.findByPk(contract_address);
    if (!contract) {
      console.log('CREATING CONTRACT');
      contract = await Models.Contract.create({
        address: contract_address,
        type: 'contract',
      });
    }
    if (!contract.abi) {
      let abi;
      try {
        abi = await etherscan.getContractAbi(contract.address);
      } catch (err) {
        // console.log(err);
        throw err;
      }

      console.log(abi);
      await contract.update({ abi });
    }
  });
}());
