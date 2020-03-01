const _ = require('lodash');
const async = require('async');

module.exports = {
  async bulkUpsert(objs) {
    // Intended for use as a Sequelize Class Method
    // this refers to the Sequelize Model
    const pKey = this.primaryKeyAttributes[0];
    const existingObjs = await this.findAll({
      attributes: [pKey],
      where: { [pKey]: _.map(objs, pKey) },
    });
    let objsByAction;
    if (!existingObjs.length) objsByAction = { create: objs };
    else {
      const existingPKeys = _.keyBy(existingObjs, pKey);
      objsByAction = _.groupBy(objs, (o) => (existingPKeys[o[pKey]] ? 'update' : 'create'));
    }
    const result = {};
    if (_.get(objsByAction, 'create.length')) {
      result.created = await this.bulkCreate(objsByAction.create);
    }
    if (_.get(objsByAction, 'update.length')) {
      result.updated = await async.mapLimit(objsByAction.update, 5, async (o) => {
        const instance = await this.findByPk(o[pKey]);
        return instance.update(o);
      });
    }
    result.created = result.created || [];
    result.updated = result.updated || [];
    return result;
  },
};
