require('../lib/run-init');

const _ = require('lodash');
const nconf = require('nconf');
const Web3 = require('web3');

const web3 = new Web3(`wss://${nconf.get('INFURA:network')}.infura.io/ws/v3/${nconf.get('INFURA:project_id')}`);
const etherscan = require('../lib/etherscan');
const addresses = require('../addresses');

const lendingPoolAbi = require('../abis/aave/LendingPool.json').abi;


const START_BLOCK = 0; // 7700000;

(async function main() {
  try {
    const contract = new web3.eth.Contract(lendingPoolAbi, addresses.AAVE_LENDING_POOL);
    const pastEvents = await contract.getPastEvents('FlashLoan', { fromBlock: START_BLOCK, toBlack: 'latest' });
    console.log(`Found ${pastEvents.length} aave flash loans`);
    // console.log(pastEvents[0]);

    const txs = {};

    for (let i = 0; i < pastEvents.slice(0, 2).length; i++) {
      const txHash = pastEvents[i].transactionHash;
      const tx = await web3.eth.getTransaction(txHash);
      console.log(`Transaction: ${txHash}`);
      const txReceipt = await web3.eth.getTransactionReceipt(txHash);
      // console.log(txReceipt);
      txs[txHash] = {
        tx,
        txReceipt,
      };
    }

    const allLogAddresses = _.chain(txs)
      .map('txReceipt')
      .map('logs')
      .flatten()
      .map('address')
      .uniq()
      .value();
    console.log(allLogAddresses);

    const contractAbis = {};

    for (let i = 0; i < allLogAddresses.length; i++) {
      const contractAddress = allLogAddresses[i];
      const contractAbi = await etherscan.getContractAbi(contractAddress);
      contractAbis[contractAddress] = contractAbi;
    }

    for (let i = 0; i < pastEvents.slice(0, 1).length; i++) {
      const txHash = pastEvents[i].transactionHash;
      const logs = txs[txHash].txReceipt.logs;
      console.log(logs);
      // for (let j = 0; j < logs.length; j++) {
      //   log = logs[j];
      //   co
      //   log.address

      // }
    }


    // contract.events.FlashLoan()
    //   .on('data', (event) => {
    //     console.log('AAVE FLASH LOAN!');
    //     console.log(event);
    //   }).on('error', console.error);
  } catch (err) {
    console.log(err);
  }
}());
