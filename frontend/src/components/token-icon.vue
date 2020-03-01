<template lang='pug'>
a.token-icon(
  :href='`https://etherscan.io/token/${token.address}`'
  :title='token.tokenSymbol'
  target='_blank'
  @click.stop
)
  //- img(:src="`https://raw.githubusercontent.com/kangarang/token-icons/master/images/${tokenAddress}.png`")
  img(v-if='icons[token.address]' :src='icons[token.address]')
  img(v-else :src='defaultIcon')

</template>

<script>
const _ = require('lodash');

const icons = _.mapKeys({
  '0x6B175474E89094C44Da98b954EedeAC495271d0F': require('@/assets/images/tokens/dai.png'),
  '0xE41d2489571d322189246DaFA5ebDe1F4699F498': require('@/assets/images/tokens/zrx.png'),
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': require('@/assets/images/tokens/wbtc.png'),
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': require('@/assets/images/tokens/usdc.png'),
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': require('@/assets/images/tokens/weth.png'),
  '0x0d8775f648430679a709e98d2b0cb6250d2887ef': require('@/assets/images/tokens/bat.svg'),
  '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5': require('@/assets/images/tokens/ctoken_eth.svg'),
  '0x39aa39c021dfbae8fac545936693ac917d5e7563': require('@/assets/images/tokens/ctoken_usdc.svg'),
  '0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e': require('@/assets/images/tokens/ctoken_bat.svg'),
  '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643': require('@/assets/images/tokens/ctoken_dai.svg'),
  '0x158079ee67fce2f58472a96584a73c7ab9ac95c1': require('@/assets/images/tokens/ctoken_rep.svg'),
  '0xf5dce57282a584d2746faf1593d3121fcac444dc': require('@/assets/images/tokens/ctoken_sai.svg'),
  '0xc11b1268c1a384e55c48c2391d8d480264a3a7f4': require('@/assets/images/tokens/ctoken_wbtc.svg'),
  '0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407': require('@/assets/images/tokens/ctoken_zrx.svg'),
}, (val, address) => address.toLowerCase());

const defaultIcon = require('@/assets/images/tokens/unknown.svg');

export default {
  props: {
    token: { type: Object },
  },
  data() {
    return {
      isOpen: this.startOpen,
    };
  },
  computed: {
    defaultIcon() { return defaultIcon; },
    icons() { return icons; },
    classes() {
      return {
        'is-open': this.isOpen,
      };
    },
  },
  methods: {
    open() { this.isOpen = true; },
    close() { this.isOpen = false; },
  },
};
</script>

<style lang='less'>
.token-icon {
  display: block;
  width: 50px;
  > img {
    width: 100%;
    height: 100%;
  }
  .no-icon {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: rgba(0,0,0,.5);
  }
}
</style>
