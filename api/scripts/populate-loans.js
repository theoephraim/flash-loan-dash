require('../lib/run-init');

const _ = require('lodash');
const nconf = require('nconf');
const async = require('async');
const Web3 = require('web3');

const etherscan = require('../lib/etherscan');
const addresses = require('../data/addresses');
const lendingPoolAbi = require('../abis/aave/LendingPool.json').abi;

const web3 = new Web3(`wss://${nconf.get('INFURA:network')}.infura.io/ws/v3/${nconf.get('INFURA:project_id')}`);
const lendingPoolContract = new web3.eth.Contract(lendingPoolAbi, addresses.AAVE_LENDING_POOL);

const START_BLOCK = 0; // 7700000;
// const START_BLOCK = 9578996;

const { dbReady, Models, Op } = require('../models');

(async function main() {
  await dbReady;

  const allTokens = await Models.Contract.findAll({ where: { type: 'token' } });
  const tokensByAddress = _.keyBy(allTokens, 'address');

  await Models.TransactionLog.destroy({ where: {} });
  await Models.Transaction.destroy({ where: {} });

  const pastEvents = await lendingPoolContract.getPastEvents('FlashLoan', { fromBlock: START_BLOCK, toBlack: 'latest' });
  console.log(`Found ${pastEvents.length} aave flash loans`);
  // console.log(pastEvents[0]);

  const txs = {};

  for (let i = 0; i < pastEvents.length; i++) {
    const event = pastEvents[i];
    const txHash = event.transactionHash;
    const tx = await web3.eth.getTransaction(txHash);
    console.log(`Transaction: ${txHash}`);
    const txReceipt = await web3.eth.getTransactionReceipt(txHash);
    // console.log(txReceipt);

    console.log(event, tx, txReceipt);

    await Models.Transaction.create({
      txHash: event.transactionHash.toLowerCase(),
      blockNumber: event.blockNumber,

      reserveTokenAddress: event.returnValues._reserve.toLowerCase(),
      borrowerAddress: event.returnValues._target.toLowerCase(),
      loanAmount: event.returnValues._amount,
      totalFee: event.returnValues._totalFee,
      protocolFee: event.returnValues._protocolFee,
      timestamp: event.returnValues._timestamp * 1000,

      eventDetails: event,
      txDetails: tx,
      txReceipt,
    });

    await async.each(txReceipt.logs, async (log) => {
      // this log is about an erc20 token
      // if (tokensByAddress[log.address]) {


      // }


      await Models.TransactionLog.create({
        txHash: event.transactionHash.toLowerCase(),
        contractAddress: log.address.toLowerCase(),
        logIndex: log.logIndex,
        details: log,
      });
    });
  }

  // const allLogAddresses = _.chain(txs)
  //   .map('txReceipt')
  //   .map('logs')
  //   .flatten()
  //   .map('address')
  //   .uniq()
  //   .value();
  // console.log(allLogAddresses);

  // const contractAbis = {};

  // for (let i = 0; i < allLogAddresses.length; i++) {
  //   const contractAddress = allLogAddresses[i];
  //   const contractAbi = await etherscan.getContractAbi(contractAddress);
  //   contractAbis[contractAddress] = contractAbi;
  // }

  // for (let i = 0; i < pastEvents.slice(0, 1).length; i++) {
  //   const txHash = pastEvents[i].transactionHash;
  //   const logs = txs[txHash].txReceipt.logs;
  //   console.log(logs);
  //   // for (let j = 0; j < logs.length; j++) {
  //   //   log = logs[j];
  //   //   co
  //   //   log.address

  //   // }
  // }
}());
