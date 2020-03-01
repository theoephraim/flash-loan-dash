<template lang='pug'>
a.eth-address(
  :href='`https://etherscan.io/address/${computedAddress}`'
  :title='computedAddress'
  target='_blank'
)
  | {{ name }}
</template>

<script>

export default {
  props: {
    contract: Object,
    address: String,
    borrowerAddress: String,
    // type:
  },
  data() {
    return {

    };
  },
  computed: {
    computedAddress() { return this.address || this.contract.address; },
    shortenedAddress() {
      return `${this.computedAddress.substr(0, 5)}...${this.computedAddress.substr(-3)}`;
    },
    name() {
      if (this.computedAddress === this.borrowerAddress) return 'BORROWER';
      if (this.contract && this.contract.name) return this.contract.name;
      return this.shortenedAddress;
    },
  },
  methods: {
  },
};
</script>

<style lang='less'>
.eth-address {
  display: inline-block;
  cursor: pointer;
  text-decoration: underline;
}
</style>
