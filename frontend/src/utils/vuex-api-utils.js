/* eslint-disable no-underscore-dangle */

import Vue from 'vue';
import Vuex from 'vuex';
import _ from 'lodash';

import api from './api';

// inspiration from a few articles
// - https://medium.com/@lachlanmiller_52885/a-pattern-to-handle-ajax-requests-in-vuex-2d69bc2f8984

const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// TODO: clean these up remove when rest of actions are refactored
export const makeAsyncMutations = (type, mutation) => ({
  [`api-${type}`]: mutation || _.noop,
});
export const makeAsyncMutationTypes = (name) => name;

// generates an "action" that wraps the whole thing with mutations so we can
// get the status and errors for a request
// eslint-disable-next-line consistent-return
export const makeAsyncAction = (type, actionSpecFn) => async function (ctx, payload) { // DO NOT USE ARROW FN
  /* eslint-disable consistent-return */

  // the argument default was not working, likely because vuex does some weird transformation?
  if (!payload) payload = {}; // eslint-disable-line no-param-reassign
  const actionSpec = actionSpecFn(ctx, payload);
  actionSpec.payload = payload;
  // build a key for where to store the request status
  // some request statuses are segmented per ID or per some other param
  // while others are singular for that request type
  // ex: "user signup" (singular)
  // vs "add external account" (per type)
  // vs "update external account" (per type and ID)
  let requestStatusKey = (ctx.state._modulePath || '') + type;
  if (actionSpec.keyRequestStatusBy) requestStatusKey += `%${actionSpec.keyRequestStatusBy}`;

  actionSpec.requestStatusKey = requestStatusKey;

  // check if we have already made the same exact request and it is still pending
  const existingRequest = ctx.rootState.apiRequests.statuses[requestStatusKey];
  if (existingRequest && existingRequest.status === 'PENDING') {
    // we exit early if the same request is already being made, but this could cause issues
    // if we are expecting a result or awaiting until the request is done
    // TODO: figure out a better way here to handle the promise and return value if any!
    if (_.isEqual(existingRequest.payload, payload)) return;
  }

  ctx.commit('API_REQUEST_PENDING', { requestStatusKey, payload }, { root: true });

  // adds a delay - sometimes helps give the backend time to process things
  // before making next request
  if (payload._delay) {
    await (timeout(payload._delay));
  }

  const { method, url, params, options, afterSuccess, afterFailure } = actionSpec;
  try {
    const requestOptions = {
      method,
      url,
      ...method === 'get' ? { params } : { data: params },
      ...options,
    };
    const request = await api(requestOptions);
    // TODO: put in separate handling for a bad mutation

    const actionParams = {
      payload,
      actionSpec,
      response: request.data,
      responseTotalCount: request.headers['x-total-count'],
    };

    await ctx.commit(`api-${type}`, actionParams);
    ctx.commit('API_REQUEST_SUCCESS', { requestStatusKey }, { root: true });
    if (typeof afterSuccess === 'function') await afterSuccess(request.data);
    // option to return the response directly - used for things like fetching the file upload URL
    if (actionSpec.returnResponse) return request.data;
    return true; // return true/false to know if it succeeded
  } catch (err) {
    console.log(err);
    if (!err.response) {
      // assume request timed out
      // ctx.commit('SHOW_API_ERROR_POPUP', 'timeout');
      return ctx.commit('API_REQUEST_FAILURE', { requestStatusKey, err: {} }, { root: true });
    }
    if (err.response.status >= 500) {
      // ctx.commit('SHOW_API_ERROR_POPUP', err.response.status);
      // clear `err` object since we're displaying a popup instead of error message
      return ctx.commit('API_REQUEST_FAILURE', { requestStatusKey, err }, { root: true });
    }

    ctx.commit('API_REQUEST_FAILURE', { requestStatusKey, err }, { root: true });
    // handle both v3 and v2 style errors
    const errorType = _.get(err, 'response.data.type') || _.get(err, 'response.data.error');
    // v3 admin deleted, v3 user is cancelled, v2 user is cancelled
    if (['AuthAdminDeleted'].includes(errorType)) {
      ctx.dispatch('auth/browserAdminLogout', null, { root: true });
      window.location = '/admin';
    } else if (['AuthUserCancelled', 'AuthExpiredByLogout'].includes(errorType)) {
      ctx.dispatch('auth/browserLogout', null, { root: true });
      window.location = '/login';
    }
    if (typeof afterFailure === 'function') {
      afterFailure(err.response.data);
    }
    return false; // return true/false to know if it succeeded
  }
};

export function buildApiActions(apiActions, more = {}) {
  const types = {};
  const mutations = { ...more.mutations };
  const actions = { ...more.actions };
  _.each(apiActions, ({ action, mutation }, apiActionName) => {
    _.assign(mutations, makeAsyncMutations(apiActionName, mutation));
    actions[`api-${apiActionName}`] = makeAsyncAction(apiActionName, action);
  });
  return { mutations, actions };
}


// Vuex module to track all api request statuses
const apiRequestsStatusModule = {
  state: {
    statuses: {},
    // keyed by request type (and sometimes more)
    // each object having {status, error, requestedAt, receivedAt}
  },
  getters: {
    // apiErrorCode: (state) => state.apiErrorCode,
    requestStatus: (state) => (name, param1, param2) => {
      let requestKey = name;
      if (param1) requestKey += `%${param1}`;
      if (param2) requestKey += `%${param2}`;
      const request = state.statuses[requestKey] || {};
      const statusProps = {
        wasRequested: !!request.requestedAt,
        isPending: request.status === 'PENDING',
        isPendingOrEmpty: !request.requestedAt || request.status === 'PENDING',
        isEmpty: !request.requestedAt,
        isError: request.status === 'FAILURE',
        isSuccess: request.status === 'SUCCESS',
        error: request.error,
        receivedAt: request.receivedAt,

      };
      if (request.error) {
        statusProps.errorMessage = request.error.message || '';
        if (request.error.details && request.error.details.messages) {
          statusProps.errorMessages = request.error.details.messages;
        }
      }
      return statusProps;
    },
    keyedRequestStatuses: (state, getters) => (name) => {
      // returns an object keyed by the params with the status
      // example: user request keyed by id would be { 1: statusForUser1... }
      const matchingRequests = {};
      _.each(state.statuses, (request, requestKey) => {
        const parts = requestKey.split('%');
        if (parts[0] === name) {
          const status = getters.requestStatus(...parts);
          _.set(matchingRequests, parts.slice(1).join('.'), status);
        }
      });
      return matchingRequests;
    },
  },
  mutations: {
    // HIDE_API_ERROR_POPUP: (state) => {
    //   Vue.delete(state, 'apiErrorCode');
    // },
    // SHOW_API_ERROR_POPUP: (state, errCode) => {
    //   Vue.set(state, 'apiErrorCode', errCode);
    // },
    API_REQUEST_PENDING: (state, { requestStatusKey, payload }) => {
      Vue.set(state.statuses, requestStatusKey, {
        status: 'PENDING',
        error: null,
        requestedAt: new Date(),
        payload,
      });
    },
    API_REQUEST_FAILURE: (state, { requestStatusKey, err }) => {
      let errorResponse = 'Unknown error';
      if (err.response) errorResponse = err.response.data;
      if (errorResponse.error) errorResponse = errorResponse.error;
      Vue.set(state.statuses, requestStatusKey, {
        ...state.statuses[requestStatusKey],
        status: 'FAILURE',
        receivedAt: new Date(),
        // TODO: figure out if we can find any other weird errors
        error: errorResponse,
      });
    },
    API_REQUEST_SUCCESS: (state, { requestStatusKey }) => {
      Vue.set(state.statuses, requestStatusKey, {
        ...state.statuses[requestStatusKey],
        status: 'SUCCESS',
        receivedAt: new Date(),
      });
    },
  },
};

// function that maps request statuses easily
// be careful to not use arrow functions here as it is important that
// the function returned is called within the context of the component
export const mapRequestStatuses = function (mappings) {
  return _.mapValues(mappings, (requestName) => function () { // DO NOT USE ARROW FN
    // combines multiple request statuses into a single status
    if (_.isArray(requestName)) {
      const statuses = _.map(requestName, (r) => this.$store.getters.requestStatus(r));
      return {
        isPending: _.some(statuses, 'isPending'),
        isError: _.some(statuses, 'isError'),
        isSuccess: _.every(statuses, 'isSuccess'),
        error: _.find(_.map(statuses, 'error')),
        receivedAt: _.maxBy(statuses, 'receivedAt'),
      };
    } else if (_.isFunction(requestName)) {
      // a function that returns the request params
      // could be dynamically choosing the path - authUser vs selectedUser
      // or could be an array with keyed request params
      const result = requestName.apply(this);
      if (_.isArray(result)) {
        return this.$store.getters.requestStatus(...result);
      }
      return this.$store.getters.requestStatus(result);
    } else if (requestName.endsWith('/*')) {
      const name = requestName.substr(0, requestName.length - 2);
      return this.$store.getters.keyedRequestStatuses(name);
    }
    return this.$store.getters.requestStatus(requestName);
  });
};


export function initializeStore(storeArgs) {
  /* eslint-disable no-param-reassign */
  storeArgs.modules = {
    ...storeArgs.modules,
    apiRequests: apiRequestsStatusModule,
  };

  // this is a workaround to store the namespace of each module in it's state
  // so we can know where we are in the reused modules for authUser / selectedUser
  // method from https://github.com/vuejs/vuex/issues/1244#issuecomment-547971322
  // NOTE - you must trigger the `bindModuleNamespaces` action on app load
  storeArgs.actions = {
    ...storeArgs.actions,
    bindModuleNamespaces({ commit }, { _modulesNamespaceMap }) {
      _.each(_modulesNamespaceMap, (module, namespace) => {
        commit('BIND_MODULE_NAMESPACES', { module, namespace });
      });
    },
  };
  storeArgs.mutations = {
    ...storeArgs.mutations,
    BIND_MODULE_NAMESPACES(ctx, { module, namespace }) {
      // we store the parent module path
      Vue.set(module.state, '_modulePath', namespace);
      const namespaceParts = namespace.split('/');
      namespaceParts.pop(); // has a trailing slash, so we pop the last one
      namespaceParts.pop(); // then we pop the actual module name
      Vue.set(module.state, '_moduleParent', namespaceParts.length ? `${namespaceParts.join('/')}/` : '');
    },
  };

  const store = new Vuex.Store(storeArgs);
  store.dispatchApiAction = (actionName, payload) => {
    // the actions created look like "api-SOME_CONSTANT"
    // so we adjust the name of the action that gets dispatched accordingly
    let apiActionName;
    if (actionName.includes('/')) {
      const parts = actionName.split('/');
      parts.push(`api-${parts.pop()}`);
      apiActionName = parts.join('/');
    } else {
      apiActionName = `api-${actionName}`;
    }
    return store.dispatch(apiActionName, payload);
  };
  return store;
}
