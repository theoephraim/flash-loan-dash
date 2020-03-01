import Vue from 'vue';
import Vuex from 'vuex';
import _ from 'lodash';

import { initializeStore, buildApiActions } from '@/utils/vuex-api-utils';

Vue.use(Vuex);

const store = initializeStore({
  modules: {
    // ethers: require('./ethers').default,
  },
  state: {
    transactions: {},
    transactionDetails: {},
    searchFilters: {},
    order: {
      field: 'timestamp',
      direction: 'desc',
    },
  },
  getters: {
    transactions: (state) => _.values(state.transactions),
    transactionDetails: (state) => (txHash) => state.transactionDetails[txHash],
  },
  ...buildApiActions({
    GET_TRANSACTIONS: {
      action: (ctx, payload) => ({
        method: 'get',
        url: '/transactions',
      }),
      mutation: (state, { response }) => {
        state.transactions = _.keyBy(response, 'txHash');
        // TODO: record total count
      },
    },
    GET_TRANSACTION_DETAILS: {
      action: (ctx, payload) => ({
        method: 'get',
        url: `/transactions/${payload.txHash}`,
        keyRequestStatusBy: payload.txHash,
      }),
      mutation: (state, { response }) => {
        Vue.set(state.transactionDetails, response.txHash, response, 'txHash');
        // TODO: record total count
      },
    },

  }, {
    actions: {

    },
    mutations: {

    },
  }),
});


export default store;
