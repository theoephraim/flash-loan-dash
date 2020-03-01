require('../lib/run-init');

const nconf = require('nconf');
const amberdata = require('../lib/amberdata');
const addresses = require('../data/addresses');


(async function main() {
  // const { records } = await amberdata.getTransactionsForAddress(addresses.AAVE_LENDING_POOL);
  // console.log(records[0]);
  // console.log('found total '+totalRecords+' transactions');
  // console.log(records[0]);
  try {
    const result = await amberdata.getTransaction('0x4555a69b40fa465b60406c4d23e2eb98d8aee51def21faa28bb7d2b4a73ab1a9');
    console.log(result);
  } catch (err) {
    console.log(err);
  }
}());
