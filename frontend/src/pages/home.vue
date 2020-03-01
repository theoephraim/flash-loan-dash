<template lang='pug'>
layout#page-home

  .txs-list
    div(v-if='getTransactionsRequest.isPending')
      .loader
        h2 Loading...
        icon(name='spinner' scale='5')
    div(v-if='getTransactionsRequest.isError')
      error-message(:request-status='getTransactionsRequest')
    div(v-if='getTransactionsRequest.isSuccess')

      form-group.filter-bar(label='Search Filters' icon='filter')
        form-row
          form-input(label='Lender' type='dropdown' v-model='filters.lender' placeholder='- All -' placeholder-selectable)
            form-input-option(value='AAVE') AAVE
            form-input-option(value='BZX' disabled) BZX (coming soon!)
          form-input(label='Token' type='dropdown' v-model='filters.token' placeholder='- All -' placeholder-selectable)
            form-input-option(value='DAI') DAI
            form-input-option(value='ZRX') ZRX
            form-input-option(value='WBTC') WBTC
            form-input-option(value='USDC') USDC
          form-input(label='Borrower' v-model='filters.borrowerAddress' placeholder='enter an address')
            form-input-option(value='DAI') DAI
            form-input-option(value='ZRX') ZRX
            form-input-option(value='WBTC') WBTC
            form-input-option(value='USDC') USDC
          //- form-input(label='Sort' v-model='sort' type='dropdown' auto-select)
          //-   form-input-option(value='timestamp') Timestamp
          //-   form-input-option(value='gasCost') Gas cost

      .total-count
        | {{ filteredTransactions.length }} matching flash loan transaction{{ filteredTransactions.length !== 1 ? 's' : '' }}
        template(v-if='hasFilters')
          | &nbsp;
          a(href='#' @click.prevent='resetFilters') clear filters

      transaction-details(
        v-for='tx in filteredTransactions' :tx='tx' :key='tx.txHash'
        @filterBorrower='setBorrowerFilter(tx.borrowerAddress)'
      )

  .donate
    .links
      a.github-logo(href='https://github.com/theoephraim/flash-loan-dash', target="_blank")
        github-logo
</template>

<script>
import _ from 'lodash';
import { mapGetters } from 'vuex';
import { vuelidateGroupMixin } from '@/utils/vuelidate-group';
import { mapRequestStatuses } from '@/utils/vuex-api-utils';

const components = {
  layout: require('@/components/layout').default,
  logo: require('@/assets/images/logo.svg?inline').default,
  'github-logo': require('@/assets/images/github.svg?inline').default,
  'transaction-details': require('@/components/transaction-details').default,
};

export default {
  components,
  mixins: [vuelidateGroupMixin],
  metaInfo() {
    return {
      title: 'Monitor flash loans on Ethereum',
      script: [],
    };
  },
  data() {
    return {
      filters: {},
      sort: 'gasCost',
    };
  },
  computed: {
    ...mapGetters([
      'transactions',
    ]),
    ...mapRequestStatuses({
      getTransactionsRequest: 'GET_TRANSACTIONS',
    }),
    hasFilters() {
      console.log(_.compact(_.values(this.filters)));
      return _.compact(_.values(this.filters)).length;
    },
    filteredTransactions() {
      const filtered = _.filter(this.transactions, {
        ...this.filters.token && { borrowedToken: { tokenSymbol: this.filters.token } },
        ...this.filters.borrowerAddress && { borrowerAddress: this.filters.borrowerAddress },
      });
      // TODO: sort
      return filtered;
    },
  },
  methods: {
    resetFilters() {
      this.filters = {
        lender: null,
        token: null,
        borrowerAddress: null,
      };
    },
    setBorrowerFilter(address) {
      console.log(address);
      this.filters.borrowerAddress = address;
    },
  },
  beforeMount() {
    console.log('before mount', this.$store);
    this.$store.dispatchApiAction('GET_TRANSACTIONS');
    this.resetFilters();
  },
  beforeDestroy() {
  },

};
</script>

<style lang='less'>
.value-prop {
  padding: 2rem 9%;
  color: white;
  text-align: center;
  h2 {}
  .benefits {
    list-style: none;
    margin-top: 10px;
      font-size: 18px;
      line-height: 1.3em;
  }
}

.create-new {
  display: flex;
  align-items: center;
  justify-content: center;
}

.donate {
  margin-top: 40px;
  text-align: center;
}

.github-logo {
  width: 50px;
  height: 50px;
  color: white;
  &:hover {
    color: @brand-color;
  }

  svg {
    display: inline-block;
    width: 50px;
    height: 50px;
    fill: currentColor;
  }
}

.links {
  padding: 20px 0;
}
.txs-list {
  padding: 10px;
  // helps clear weird margin issues at the top of the page
  &:before {
    content: '';
    display: block;
    height: 1px;
    background: rgba(0,0,0,0);
  }
}
.loader {
  color: white;
  padding: 50px;
  text-align: center;
}
.form-group.filter-bar {
  margin-bottom: 0;
}
.total-count {
  font-size: 12px;
  margin: 10px 0 15px;
  text-align: center;
  font-style: italic;
  opacity: .6;

}

</style>
