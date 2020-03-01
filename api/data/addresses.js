const _ = require('lodash');

module.exports = _.mapValues({
  AAVE_LENDING_POOL: '0x398eC7346DcD622eDc5ae82352F02bE94C62d119',
  AAVE_LENDING_POOL_CORE: '0x3dfd23A6c5E8BbcFc9581d2E864a68feb6a076d3',
}, (a) => a.toLowerCase());
