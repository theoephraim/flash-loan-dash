const _ = require('lodash');
const { LogDecoder } = require('@maticnetwork/eth-decoder').default;
const BigNumber = require('bignumber.js');

const { tokensByAddress } = require('../lib/tokens-cache');
const { Models } = require('../models');
const addresses = require('../data/addresses');

const FLASH_LENDERS = [addresses.AAVE_LENDING_POOL_CORE];

module.exports = {
  modelName: 'TransactionLog',
  tableName: 'transaction_logs',
  props: {
    id: 'id',
    txHash: { ref: 'Transaction', type: 'txHash', required: true },
    type: { enum: 'token_transfer exchange loan loan_repayment unknown'.split(' ') },
    logIndex: 'int',
    contractAddress: {
      ref: 'Contract', type: 'ethAddress', noRefConstraint: true, required: true,
    },
    details: { type: 'json', public: false },
    decoded: 'json',

    // if we detect it's a token transfer
    srcAddress: { ref: 'Contract', type: 'ethAddress' },
    dstAddress: { ref: 'Contract', type: 'ethAddress' },
    transferAmount: 'wei',
  },
  virtualProps: {
    contract() { return this.refs.contract; },
    src() { return this.refs.src; },
    dst() { return this.refs.dst; },
    isTokenTransfer() {
      return !!tokensByAddress[this.contractAddress] && _.get(this, 'decoded.event') === 'Transfer';
    },
  },
  instanceMethods: {
    async decode() { // saves the decoded info
      const contract = await this.populateRef('contract');

      if (!contract) {
        console.log('contract not found');
        return;
      } if (!contract.abi) {
        console.log('contract found, but no abi');
        return;
      }

      const contractDecoder = new LogDecoder([contract.abi]);
      const [decoded] = contractDecoder.decodeLogs([this.details]);

      // create sender/receiver addresses in our db if they dont exist already
      if (contract && decoded && decoded.event === 'Transfer') {
        let srcAddress = decoded.values.src || decoded.values.from || decoded.values._from;
        let dstAddress = decoded.values.dst || decoded.values.to || decoded.values._to;
        let transferAmount = decoded.values.wad || decoded.values.amount || decoded.values.value || decoded.values._value;
        if (transferAmount) transferAmount = new BigNumber(transferAmount);

        if (!srcAddress || !dstAddress || !transferAmount) {
          console.log(decoded);
          throw new Error('WHAT');
        }
        srcAddress = srcAddress.toLowerCase();
        dstAddress = dstAddress.toLowerCase();

        await Models.Contract.upsert({
          address: srcAddress,
        });
        await Models.Contract.upsert({
          address: dstAddress,
        });

        let type = 'token_transfer';
        console.log(transferAmount.isEqualTo(this.refs.tx.loanAmount));
        // console.log(typeof FLASH_LENDERS[0], typeof srcAddress, FLASH_LENDERS[0] === srcAddress);
        if (FLASH_LENDERS.includes(srcAddress) && transferAmount.isEqualTo(this.refs.tx.loanAmount)) {
          type = 'loan';
        } else if (FLASH_LENDERS.includes(dstAddress) && transferAmount.isGreaterThan(this.refs.tx.loanAmount)) {
          type = 'loan_repayment';
        }

        console.log(type, srcAddress, dstAddress, transferAmount);

        await this.update({
          decoded,
          type,
          srcAddress,
          dstAddress,
          transferAmount,
        });
      } else {
        await this.update({ decoded });
      }
    },
  },
  classMethods: {
  },
  hideTimestamps: true,
  dummyDefaults: {
  },
};
