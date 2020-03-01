<template lang='pug'>
.transaction-detail(:class='classes')
  .spacer
  .content(@click='!isOpen && open()')
    .close-x(@click.stop='close')
      icon(name='times')
    .summary-info
      .basic-info-wrap
        a.pool-icon(href='https://aave.com/' target='_blank' @click.stop)
          img(src='~@/assets/images/aave-ghost.svg')
        token-icon(:token='tx.borrowedToken')
        form-row
          form-input(label='Borrower' type='container')
            eth-address(:address='tx.borrowerAddress')
            icon.search-borrower(name='search' @click.native.stop='() => $emit("filterBorrower")')
          form-input(label='Amount' type='container')
            eth-amount(:wei='tx.loanAmount' :contract='tx.borrowedToken')
          form-input(label='Fee' type='container')
            div
              eth-amount(:wei='tx.totalFee' :contract='tx.borrowedToken')
            .protocol-fee
              eth-amount(:wei='tx.protocolFee' :contract='tx.borrowedToken')
              |  protocol
          form-input(label='Gas Cost' type='container')
            eth-amount(:wei='tx.gasCost')


      .meta
        .transaction-data
          a.tx-hash(:href='`https://etherscan.io/tx/${tx.txHash}`' target='_blank') {{ tx.txHash.substr(0, 7) }}...{{ tx.txHash.substr(-5) }}
          span.block-number
            icon(name='th-large')
            |  {{ tx.blockNumber }}
        .timestamp {{ tx.timestamp | datetime }} ({{ tx.timestamp | timeago }})
    .details-wrap(v-if='isOpen')
      template(v-if='detailsRequest.isPending') Loading details...
      template(v-else-if='detailsRequest.isError')
        error-message(:request-status='detailsRequest')
      template(v-else)
        .details-header
          h3 Transaction Logs
          form-input.filter(v-model='simpleLogs' type='checkbox' no-label) Simple
          //- form-input(v-model='simpleLogs' type='radio' no-label)
          //-   form-input-option(:value='false') everything
          //-   form-input-option(:value='true') only token transfers

        .logs-container
          .tx-log(
            v-for='log in filteredLogs' :key='`${tx.txHash}-${log.logIndex}`'
          )
            .log-index {{ log.logIndex }}
            token-icon(:token='log.contract || { address: log.contractAddress }')
            .log-type(:class='log.type') {{ getLogType(log) }}

            .log-addresses(v-if='log.srcAddress')
              span.log-from
                eth-address(:contract='log.src' :borrower-address='tx.borrowerAddress')
              icon(name='long-arrow-right')
              span.log-to
                eth-address(:contract='log.dst' :borrower-address='tx.borrowerAddress')

            .log-amount(v-if='log.transferAmount')
              eth-amount(:wei='log.transferAmount' :contract='log.contract')


</template>

<script>
import _ from 'lodash';
import { mapGetters } from 'vuex';
import { mapRequestStatuses } from '@/utils/vuex-api-utils';

const components = {
  'token-icon': require('./token-icon').default,
};

const SIMPLE_TYPES = ['token_transfer', 'loan', 'loan_repayment'];

export default {
  components,
  metaInfo() {
    if (!this.isOpen) return {};
    // CAUTION - only a single body class can be set this way at a time
    // generally we should be avoiding body classes though, so it's ok for now?
    return { bodyAttrs: { class: 'popup-active' } };
  },
  props: {
    tx: { type: Object },
    startOpen: Boolean,
  },
  data() {
    return {
      isOpen: !!this.startOpen,
      simpleLogs: true,
    };
  },
  computed: {
    ...mapRequestStatuses({
      detailsRequest() { return ['GET_TRANSACTION_DETAILS', this.tx.txHash]; },
    }),
    classes() {
      return {
        'is-open': this.isOpen,
        'is-closed': !this.isOpen,
      };
    },
    details() { return this.$store.getters.transactionDetails(this.tx.txHash); },
    filteredLogs() {
      if (!this.simpleLogs) return this.details.logs;

      const filtered = _.filter(this.details.logs, (l) => SIMPLE_TYPES.includes(l.type));
      const sorted = _.sortBy(filtered, (l) => {
        if (l.type === 'loan') return -1;
        if (l.type === 'loan_repayment') return 100000000;
        return l.logIndex;
      });
      return sorted;
    },

  },
  methods: {
    open() {
      this.$store.dispatchApiAction('GET_TRANSACTION_DETAILS', { txHash: this.tx.txHash });
      this.isOpen = true;
    },
    close() {
      this.isOpen = false;
      console.log('close!');
      return false;
    },
    getLogType(log) {
      if (log.type === 'loan') return 'LOAN';
      if (log.type === 'token_transfer') return 'TOKEN';
      if (log.type === 'loan_repayment') return 'REPAY';
      if (log.decoded) {
        return log.decoded.event;
      }
      return '???';
    },
  },
};
</script>

<style lang='less'>
body.popup-active {
  overflow: hidden;
  .popup-mask { display: block; }
}

.popup-mask {
  background: fade(#000, 95);
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  display: none;
}


.transaction-detail {
  color: white;

  .content {
    border-radius: 10px;
    background: #333;
    padding: 10px;
    margin-bottom: 10px;
    z-index: 2400;
    display: flex;
    flex-direction: column;
    transition: .3s all;
  }
  .summary-info {
    flex-grow: none;
  }
  .details-wrap {
    margin-top: 5px;
    flex: 1 0 0;
    overflow: scroll;
  }
  .basic-info-wrap {
    display: flex;
    align-items: flex-start;
  }
  .token-icon {

  }
  .pool-icon {
    display: block;
    width: 30px;
    > img {
      max-width: 100%;
    }
    padding: 3px 0;
    margin-right: -8px;
    // opacity: .8;
    position: relative;
  }

  .details-header {
    position: absolute;
    background: #222;
    left: 0;
    right: 0;
    padding: 5px 10px;
    // top: 0;
    display: flex;
    justify-content: space-between;
  }

  .meta {
    font-size: 10px;
    line-height: 1em;
    text-align: right;
    font-style: italic;
    opacity: .5;
    display: flex;
    justify-content: space-between;
    margin-bottom: -4px;
    .timestamp {

    }
    .tx-hash {
      margin-right: 10px;
    }
  }

  .logs-container {
    padding-top: 50px;
  }
  .protocol-fee {
    font-size: 12px;
    font-style: italic;
    opacity: .5;
  }

  > .spacer {
    display: none;
    margin-bottom: 10px;
  }

  .close-x {
    display: none;
    position: absolute;
    top: 5px;
    right: 5px;
    color: #FFF;
    width: 44px;
    height: 44px;
    padding: 8px;
    cursor: pointer;
    z-index: 2002;
    svg {
      scale: 1;
      transition: all 0.3s;
      display: block;
      width: 100%;
      height: 100%;
      &:hover {
        transform: scale(1.2);
      }
    }
  }


  &.is-closed {
    cursor: pointer;
    .content {
      &:hover {
        background: #444;
      }
    }

  }
  &.is-open {
    > .spacer { display: block; }
    .close-x { display: block; }
    .content {
      position: fixed;
      top: 10px;
      bottom: 10px;
      left: 10px;
      right: 10px;
    }
  }


  .tx-log {
    font-size: 12px;
    border-bottom: 1px solid #777;
    display: flex;
    padding: 5px 0;
    .token-icon {
      width: 30px;
      margin-right: 5px;
    }
    .log-index {
      flex-grow: none;
      display: inline-block;
      width: 15px;
      height: 24px;
      line-height: 24px;
      font-size: 8px;
      opacity: .12;
    }
    .log-amount {
      flex: 1 0 0;
      text-align: right;
    }
    .log-type {
      margin-right: 10px;
      color: rgb(255, 209, 94);
      &.loan, &.loan_repayment {
        color: rgb(117, 215, 32);
      }
      &.token_transfer {
        color: rgb(51, 211, 203);
      }
    }
    .log-addresses {
      .icon {
        margin: 0 5px;
      }
    }

  }
  .search-borrower {
    margin-left: 5px;
  }

}
</style>
