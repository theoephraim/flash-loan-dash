const nconf = require('nconf');

exports.shorthands = {
  json: { type: 'jsonb' },
  currencyCode: { type: 'character(3)', default: 'USD' },
  ip: { type: 'string' },
};

exports.up = (pgm) => {
  // Sets the "system time" of the databse to UTC
  if (nconf.get('NODE_ENV') === 'development') {
    pgm.sql("ALTER DATABASE postgres SET timezone TO 'UTC'");
    pgm.sql('SELECT pg_reload_conf()');
  }
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
};
