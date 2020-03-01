/* eslint-disable */

require('../lib/run-init');

const nconf = require('nconf');
const _ = require('lodash');

const {
  dbReady, Models, Op, sequelize,
} = require('../models');

// hash of "password"
const PASSWORD_HASH = '$2a$11$IOLIQZS1Yb3eFO7afEcxnuog0NTM1GF2AnRE36UnJR6SBGIoZFFa2';

(async function main() {
  await dbReady;

  try {
    await sequelize.query(`ALTER DATABASE ${nconf.get('DB:database')} SET timezone TO 'UTC'`);
  } catch (e) { }
  try {
    await sequelize.query('CREATE EXTENSION pgcrypto');
  } catch (e) { }

  // syncs models to db structure -- NOT FOR PRODUCTION just for dev at project beginning
  await sequelize.sync({ alter: true });

  console.log('Done!');
  process.exit(0);
}());
