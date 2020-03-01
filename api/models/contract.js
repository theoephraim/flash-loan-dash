module.exports = {
  modelName: 'Contract',
  tableName: 'contracts',
  props: {
    address: { type: 'ethAddress', primaryKey: true },
    type: { enum: 'token contract dao unknown'.split(' ') },
    name: 'string',
    website: 'string', // some bad data in contracts so cant use type 'url'

    // if type = token
    tokenSymbol: 'name',
    tokenDecimals: 'smallint',

    abi: { type: 'json', public: false },
    details: { type: 'json', public: false },
  },
  virtualProps: {
  },
  instanceMethods: {
  },
  classMethods: {
  },
  hideTimestamps: true,
  dummyDefaults: {
  },
};
