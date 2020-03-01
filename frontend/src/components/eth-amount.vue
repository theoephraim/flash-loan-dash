<template lang='pug'>
.eth-amount()
  span.amount {{ amount.toFixed(3) }}
  span.symbol(:title='fullTokenName')  {{ symbol }}
  span.usd (${{ usdAmount.toFixed(2) }})
</template>

<script>

export default {
  props: {
    wei: String,
    contract: { type: Object, default: () => ({}) },
  },
  data() {
    return {

    };
  },
  computed: {
    amount() {
      return this.wei / (10 ** this.numDecimals);
    },
    numDecimals() { return this.contract.tokenDecimals || 18; },
    symbol() { return this.contract.tokenSymbol || 'ETH'; },
    fullTokenName() { return this.contract.name || 'Ether'; },

    usdAmount() {
      if (this.symbol === 'ZRX') return this.amount * 0.2323;
      if (this.symbol === 'cDAI') return this.amount * 0.0203;
      if (this.symbol === 'cETH') return this.amount * 4.4568;
      if (this.symbol === 'cUSDC') return this.amount * 0.0206;
      if (this.symbol === 'WBTC') return this.amount * 8558.7460;
      if (this.symbol === 'BAT') return this.amount * 0.2159;


      if (this.symbol.includes('DAI')) return this.amount;
      if (this.symbol.includes('USD')) return this.amount;
      if (this.symbol.includes('ETH')) return this.amount * 223.07;

      return '?';
    },
  },
  methods: {
  },
};
</script>

<style lang='less'>
.eth-amount {
  display: inline-block;

  .usd {
    margin-left: .5em;
  }
}
</style>
