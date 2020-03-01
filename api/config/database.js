const nconf = require('nconf');
const path = require('path');

// when in CI mode, nanobox creates some default values for the DB we want to stuff into nconf
// if (process.env.CI) {
//   nconf.set('DB:username', nconf.get('DATA_DB_USER'));
//   nconf.set('DB:database', 'gonano');
//   nconf.set('DB:host', nconf.get('DATA_DB_HOST'));
//   nconf.set('DB:password', nconf.get('DATA_DB_PASS'));
// }

const DB = nconf.get('DB');

// const rdsCaPath = path.resolve(`${__dirname}/../static/certs/rds-combined-ca-bundle.pem`);
// const useCert = !['test', 'local'].includes(nconf.get('LEADEREQ_ENV'));

const connectionUrl = [
  'postgres://',
  DB.username ? `${DB.username || ''}:${DB.password || ''}@` : '',
  `${DB.host}:${DB.port}/${DB.database}`,
  // ...useCert ? [`?ssl=true&sslmode=verify-full&sslcert=${rdsCaPath}`] : [],
].join('');

nconf.set('DATABASE_URL', connectionUrl);

module.exports = {
  DB,
  connectionUrl,
};
