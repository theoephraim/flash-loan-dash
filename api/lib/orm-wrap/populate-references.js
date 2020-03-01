const _ = require('lodash');
const async = require('async');


// This function uses the model options to create populateRefs for each model
function buildPopulateFunctions(modelOptions) {
  const allRefFields = _.pickBy(modelOptions.props, (opts, key) => opts.ref !== undefined);
  const complexRefs = modelOptions.complexRefs || {};
  const allRefNames = [
    ..._.map(allRefFields, 'refAs'),
    ..._.keys(complexRefs) || [],
  ];

  async function populateRef(refName, forceReload = false) {
    if (!allRefNames.includes(refName)) {
      throw new Error(`Invalid ref to populate: ${refName}`);
    }

    // if already populated, no need to fetch again! (unless forceReload = true)
    this.refs = this.refs || {};
    if (!forceReload && this.refs[refName]) return this.refs[refName];

    // deal with complex refs - just calls the function
    if (complexRefs[refName]) {
      this.refs[refName] = await modelOptions.complexRefs[refName].call(this);
    } else {
      const refFieldAndOptions = _.pickBy(modelOptions.props, { refAs: refName });
      const [refKey, fieldOptions] = _.toPairs(refFieldAndOptions)[0];
      const Models = this.sequelize.models;
      const ModelToFetch = Models[fieldOptions.ref];
      const idToFetch = this[refKey];
      if (idToFetch) {
        this.refs[refName] = await ModelToFetch.findByPk(idToFetch);
      }
    }
    return this.refs[refName];
  }
  async function populateRefs(refNames, forceReload = false) {
    if (!refNames) refNames = allRefNames;
    else if (_.isString(refNames)) refNames = refNames.split(' ');
    // NOTE - be careful about the context of how populateRef is called
    // because `this` in populateRef must be this instance
    await async.each(refNames, async (refName) => this.populateRef(refName, forceReload));
    return this.refs;
  }

  // these get added into each model
  return {
    populateRefs,
    populateRef,
  };
}

function boltAssociations(instances, includeMap) {
  if (!includeMap) return;
  instances = instances.filter((i) => i);
  _.each(includeMap, (settings, associationName) => {
    const [, refName] = associationName.split('-');
    _.each(instances, (instance) => {
      instance.refs = instance.refs || {};
      instance.refs[refName] = instance[associationName];
    });
    boltAssociations(_.map(instances, (instance) => instance.refs[refName]), settings.includeMap);
  });
}

const populateHooks = {
  beforeCreate(m) { m.refs = m.refs || {}; },
  afterFind(found, options) {
    if (found && !options.raw) {
      if (_.isArray(found)) _.each(found, (m) => { m.refs = m.refs || {}; });
      else found.refs = found.refs || {};
    }

    // remap "included" instances into refs
    boltAssociations(_.isArray(found) ? found : [found], options.includeMap);
  },
  beforeBulkCreate(instances) {
    _.each(instances, (i) => populateHooks.beforeCreate(i));
  },
};


module.exports = {
  populateHooks,
  buildPopulateFunctions,
};
