/* eslint-disable global-require,import/no-dynamic-require */

const fs = require('fs');
const _ = require('lodash');
const Sequelize = require('sequelize');
const nconf = require('nconf');
require('colors');
const BigNumber = require('bignumber.js');

const { logger } = require('../lib/logger');
const { defineModel, initializeAssociations } = require('../lib/orm-wrap/define-model');
const { connectionUrl, DB } = require('../config/database');
const defer = require('../lib/defer-promise');

Sequelize.Promise.config({ longStackTraces: true });

const Models = {};

const databaseInit = defer();
const dbReady = databaseInit.promise;

let disableLogging = false;

function logSql(...args) {
  /* eslint-disable no-console */
  // temporary disable logging, used while resetting test DB
  if (disableLogging) return;
  console.log(args[0]); // log just the query
}


// decimal types are being returned as strings?
// https://github.com/sequelize/sequelize/issues/8019
// Sequelize.postgres.DECIMAL.parse = (value) => parseFloat(value);
Sequelize.postgres.DECIMAL.parse = (value) => new BigNumber(value);
Sequelize.postgres.DECIMAL.stringify = (value) => (value instanceof BigNumber ? value.toString() : value);

const usingTunnel = nconf.get('DB:tunnel');

const dialectOptions = {
  supportBigNumbers: true,
};

let dbUrl = connectionUrl;
// if we're using the tunnel, redirect to localhost
if (usingTunnel) {
  dbUrl = connectionUrl.replace(`${DB.host}:${DB.port}`, 'localhost:27777');
  dialectOptions.ssl = { rejectUnauthorized: false };
} else if (DB.host !== 'localhost') {
  const sslCertCa = fs.readFileSync(`${__dirname}/../config/do-ca-certificate.crt`);
  dialectOptions.ssl = {
    rejectUnauthorized: true,
    ca: [sslCertCa],
  };
}


const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: nconf.get('DB:debug') ? logSql : false,
  pool: {
    max: 25,
    min: 0,
    acquire: 45000,
    idle: 10000,
  },
  dialectOptions,
  // native: true,
});

function initConnection() {
  sequelize
    .authenticate()
    .then(() => {
      fs.readdirSync(__dirname).forEach((filename) => {
        if (filename === 'index.js') return;

        const modelDefinition = require(`./${filename}`);
        Models[modelDefinition.modelName] = defineModel(sequelize, modelDefinition);
      });
      _.each(Models, (m) => initializeAssociations(Models, m));
      databaseInit.resolve();
    })
    .catch((err) => {
      databaseInit.reject();
      logger.log('DB CONNECTION FAILED', {
        error: err,
        connection: _.omit(DB, 'password'),
      });
    });
}


async function resetTestDb() {
  disableLogging = true;
  await sequelize.truncate({ cascade: true });
  disableLogging = false;
}

// if (nconf.get('DB:tunnel')) {
//   const readline = require('readline');
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });

//   console.log(`\


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// WARNING - CONNECTING TO PRODUCTION DATABASE!
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// \
// `.bgMagenta.white);
//   rl.question('Type your username to proceed to connect to production: ', (answer) => {
//     // TODO: Log the answer in a database

//     console.log('TO BE IMPLEMENTED');

//     rl.close();
//   });
// } else {

initConnection();

const selectQuery = async (q) => sequelize.query(q, { type: sequelize.QueryTypes.SELECT });

module.exports = {
  Models,
  sequelize,
  dbReady,
  resetTestDb,
  Op: Sequelize.Op,
  SQLiteral: Sequelize.literal,
  selectQuery,
};
