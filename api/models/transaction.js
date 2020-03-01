const _ = require('lodash');

const { Models } = require('../models');
const { tokensByAddress } = require('../lib/tokens-cache');

module.exports = {
  modelName: 'Transaction',
  tableName: 'transactions',
  props: {
    txHash: { type: 'string', primaryKey: true },
    blockNumber: 'bigint',
    // from the event
    reserveTokenAddress: { // these will all be contracts w/ type = token
      ref: 'Contract', type: 'ethAddress', required: true,
    },
    borrowerAddress: { ref: 'Contract', type: 'ethAddress', noRefConstraint: true },
    loanAmount: 'wei',
    totalFee: 'wei',
    protocolFee: 'wei',
    gasCost: 'wei',
    timestamp: 'timestamp',

    eventDetails: { type: 'json', public: false },
    txDetails: { type: 'json', public: false },
    txReceipt: { type: 'json', public: false },
  },
  virtualProps: {
    borrowedToken() {
      return tokensByAddress[this.reserveTokenAddress];
    },
    logs() {
      return this.refs.logs;
    },
  },
  complexRefs: {
    // fetch all logs
    async logs() {
      return Models.TransactionLog.findAll({
        where: { txHash: this.txHash },
        order: [['logIndex', 'asc']],
      });
    },
  },
  instanceMethods: {
  },
  classMethods: {
  },
  hideTimestamps: true,
  dummyDefaults: {
  },
};
