const nconf = require('nconf');
const _ = require('lodash');
const Sequelize = require('sequelize');
const decamelize = require('decamelize');
const uuidv4 = require('uuid/v4');

const { buildToVersionedJSON } = require('./versioned-serializer');
const { buildPopulateFunctions, populateHooks } = require('./populate-references');
const { bulkUpsert } = require('./bulk-upsert');
const { buildDummyGeneratorFunctions } = require('./dummy-builder');

const secure = require('../encryption');

const SLUG_REGEX = /^[0-9a-z-]+$/;

const ormTypeLookup = {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  json: { type: Sequelize.JSONB },
  // hstore: { type: Object },  // NOT SUPPORTED?
  smallint: { type: Sequelize.SMALLINT },
  int: { type: Sequelize.INTEGER },
  bigint: { type: Sequelize.BIGINT },
  money: { type: Sequelize.DECIMAL(12, 2) },
  currency: { type: Sequelize.STRING(3) },
  percent: { type: Sequelize.DECIMAL(2, 2) },
  rate: { type: Sequelize.DECIMAL(12, 6) },
  irr: { type: Sequelize.DECIMAL(30, 12) },

  ethAddress: { type: Sequelize.STRING(42) }, // eth address
  txHash: { type: Sequelize.STRING }, // eth address
  wei: { type: Sequelize.NUMERIC(78, 0) }, // wei amounts

  email: { type: Sequelize.STRING, validate: { isEmail: true } },
  url: { type: Sequelize.STRING, validate: { isUrl: true } },
  float: { type: Sequelize.FLOAT },
  text: { type: Sequelize.TEXT },
  string: { type: Sequelize.STRING },
  slug: { type: Sequelize.STRING, validate: { is: SLUG_REGEX } },
  boolean: { type: Sequelize.BOOLEAN },

  timestamp: { type: Sequelize.DATE },
  // datetime: { type: Sequelize.DATE },
  date: { type: Sequelize.DATEONLY },

  // lnglat: { type: [Number] },

  address: { type: Sequelize.JSONB },
  phone: { type: Sequelize.STRING },
  uuid: { type: Sequelize.UUID },
  timezone: { type: Sequelize.STRING },
  ip: { type: Sequelize.STRING },
};

function mapValuesDeep(body, fn, keys) {
  if (_.isEmpty(body)) {
    return body;
  } if (_.isArray(body)) {
    return _.map(body, (elem) => mapValuesDeep(elem, fn, keys));
  } if (_.isObject(body)) {
    return _.mapValues( // eslint-disable-line curly
      body,
      (v, k) => (keys.includes(k) ? fn(v) : mapValuesDeep(v, fn, keys)),
    );
  }
  return body;
}

function convertToOrmType(type = 'string') {
  let arrayType = false;
  let typeArgs;
  // check for array types -- ex: {type: '[string]'}
  if (type.match(/\[.*\]/)) {
    arrayType = true;
    type = type.substr(1, type.length - 2);
  }
  // check for args -- ex: {type: 'string(2)'}
  if (type.includes('(')) {
    /* eslint-disable prefer-destructuring */
    const splitArgs = type.match(/(.*)\((.*)\)/);
    type = splitArgs[1];
    typeArgs = splitArgs[2].split(',');
  }
  // convert to sequelize type, sometimes has validation as well
  const ormTypeDef = _.clone(ormTypeLookup[type]);

  if (typeArgs) ormTypeDef.type = ormTypeDef.type(...typeArgs);
  if (arrayType) {
    ormTypeDef.type = Sequelize.ARRAY(ormTypeDef.type);
  }
  return ormTypeDef;
}

function defineModel(sequelize, modelOptions) {
  const {
    modelName, tableName, props, virtualProps,
  } = modelOptions;

  const ormProps = {
    createdAt: { field: 'created_at', type: Sequelize.DATE },
    updatedAt: { field: 'updated_at', type: Sequelize.DATE },
  };
  const ormOptions = {
    tableName,
    timestamps: true, // enable created_at and updated_at
    underscored: true, // use snake_case for auto generated columns (timestamps)
    getterMethods: {},
    setterMethods: {},
  };

  _.each(props, (propOptions, propKey) => {
    // skip foreign keys, since they are initialized after model is created
    // sequelize says it adds the fields directly but seems like it does not
    // see: https://github.com/sequelize/sequelize/issues/5036
    if (propOptions.ref) {
      if (!propOptions.type) propOptions.type = 'int';

      // if `refAs` is unset, use the field name but get rid of "Id" or "Ids"
      // Ex: 'creatorId' -> 'creator'
      propOptions.refAs = propOptions.refAs || propKey.replace(/(I[Dd]s?|Address|Hash)$/, '');
      propOptions.refType = propOptions.refType || 'M:1';
    }

    // You can pass in only the type as a shorthand
    if (_.isString(propOptions)) {
      propOptions = { type: propOptions };
      props[propKey] = propOptions;
    }
    // use snake_case fields even though we use camelCase props
    propOptions.field = decamelize(propOptions.field || propKey);

    if (propOptions.enum) {
      propOptions.type = propOptions.type || 'string'; // default to string
      propOptions.validate = propOptions.validate || {};
      propOptions.validate.isIn = [propOptions.enum]; // sequelize wants [[...]]
    }

    let encryptedPropKey;
    if (propOptions.encrypted) {
      // a property to get the encrypted value, treated mostly like an unencrypted column
      encryptedPropKey = `${propKey}Encrypted`;
      if (propOptions.encrypted === true) {
        // easy getter/setters for entirely encrypted field
        ormOptions.getterMethods[propKey] = function () { // eslint-disable-line func-names
          const decrypted = secure.decrypt(this[encryptedPropKey]);
          if (decrypted !== null) {
            if (propOptions.type === 'date') new Date(decrypted).toISOString().substr(0, 10);
          }
          return decrypted;
        };
        ormOptions.setterMethods[propKey] = function (val) { // eslint-disable-line func-names
          this[encryptedPropKey] = secure.encrypt(val);
        };
      } else if (propOptions.encrypted instanceof Array) {
        // getters/setters for keys inside array of objects
        ormOptions.getterMethods[propKey] = function () { // eslint-disable-line func-names
          return mapValuesDeep(this[encryptedPropKey], secure.decrypt, propOptions.encrypted);
        };
        ormOptions.setterMethods[propKey] = function (val) { // eslint-disable-line func-names
          this[encryptedPropKey] = mapValuesDeep(val, secure.encrypt, propOptions.encrypted);
        };
      }
    }
    ormProps[propOptions.encrypted ? encryptedPropKey : propKey] = {
      ...propOptions,
      ...convertToOrmType(propOptions.encrypted === true ? 'string' : propOptions.type),
      ...propOptions.required && { allowNull: false },
      ...propOptions.default !== undefined && { defaultValue: propOptions.default },
    };
  });

  // set up "virtual" props -- ie
  _.each(virtualProps, (propOptions, propKey) => {
    if (_.isFunction(propOptions)) propOptions = { get: propOptions };
    if (propOptions.get) {
      ormOptions.getterMethods[propKey] = propOptions.get;
    }
    if (propOptions.set) {
      ormOptions.setterMethods[propKey] = propOptions.set;
    }
  });

  // include multi-column validations (constraints)
  if (modelOptions.constraints) ormOptions.validate = modelOptions.constraints;

  const model = sequelize.define(modelName, ormProps, ormOptions);
  model.modelOptions = modelOptions;

  // add a .calcs object to store calculated (fetched from the db) values
  model.addHook('afterCreate', (m) => { m.calcs = m.calcs || {}; });
  model.addHook('afterFind', (found, options) => {
    if (found && !options.raw) {
      if (_.isArray(found)) _.each(found, (m) => { m.calcs = m.calcs || {}; });
      else found.calcs = found.calcs || {};
    }
  });

  // automatically fill in UUID primary keys
  model.addHook('beforeCreate', function beforeCreate(m, options) {
    // TODO: let postgres handle this if we can natively support it
    const Model = this;
    const primaryKeyAttribute = Model.primaryKeyAttribute;
    if (Model.modelOptions.props[primaryKeyAttribute].type === 'uuid') {
      if (!m[primaryKeyAttribute]) m[primaryKeyAttribute] = uuidv4();
    }
  });
  _.each(populateHooks, (fn, hookName) => model.addHook(hookName, fn));
  _.each(modelOptions.hooks, (fn, hookName) => model.addHook(hookName, fn));

  // set up class methods
  _.assign(model, {
    ...modelOptions.classMethods,
    ...buildDummyGeneratorFunctions(modelOptions),
    bulkUpsert,
    col(propName, alias = false) {
      let rawFieldName;
      if (['createdAt', 'updatedAt'].includes(propName)) {
        rawFieldName = propName.replace('At', '_at');
      } else {
        // get snake_case name, and original name if using field option in prop definition
        rawFieldName = props[propName].field;
      }
      let asAlias = '';
      if (alias) asAlias = ` AS "${alias === true ? propName : alias}"`;
      return rawFieldName + asAlias;
    },
    association(colName) {
      if (!props[colName]) throw new Error(`Non-existant column: ${colName}`);
      return props[colName].association;
    },
    enumOptions(colName) {
      if (!props[colName]) throw new Error(`Non-existant column: ${colName}`);
      return props[colName].enum;
    },
  });

  // set up instance methods
  _.assign(model.prototype, {
    ...modelOptions.instanceMethods,
    toVersionedJSON: buildToVersionedJSON(modelOptions),
    ...buildPopulateFunctions(modelOptions),
    getModelName() { return this.constructor.name; },
  });


  return model;
}

let associationsIndex = 0;
function initializeAssociations(Models, Model) {
  const { props } = Model.modelOptions;

  _.each(props, (propOptions, propKey) => {
    if (!propOptions.ref) return;

    const RelatedModel = Models[propOptions.ref];

    // TODO: support many:many relations

    // sequelize can do some of this stuff automatically
    // but it will be more clear to make it all explicit

    // we use "named" associations with a junky name "assoc-refName-1"
    // to avoid any naming collisions with our virtual properties
    // Additionally we use an afterFind hook to put the associated models
    // back into `.refs` according to our settings

    propOptions.association = Model.belongsTo(RelatedModel, {
      as: `assoc-${propOptions.refAs}-${associationsIndex++}`,
      foreignKey: propKey,
      targetKey: propOptions.refKey, // which field to reference
      ...propOptions.noRefConstraint && { constraints: false },
    });
  });
}

module.exports = {
  defineModel,
  initializeAssociations,
};
