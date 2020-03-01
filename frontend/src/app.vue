<template lang='pug'>
#app
  .popup-mask
  router-view
</template>

<script>
import faviconUrl from '@/assets/images/favicon.png';

export default {
  metaInfo: {
    title: '✨🤑📈', // set a title
    titleTemplate: '%s | Flash Loan Watch',
    link: [
      { rel: 'shortcut icon', type: 'image/png', href: faviconUrl },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css?family=Oxygen' },
    ],
    script: [
      {
      },
    ],
  },
  mounted() {
    // this.$store.dispatch('ethers/init');
  },
};
</script>

<style lang="less">
@import '~normalize.css';

html, body {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

*, *:before, *:after {
  box-sizing: inherit;
}

body {
  transition: background-color .5s;
}

#app {
  font-family: @regular-font;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

h1, h2 {
  font-family: @fancy-font;
}
h2 {
  font-weight: normal;
  font-size: 36px;
}
h3, .small-uppercase {
  font-size: 11px;
  font-weight: normal;
  text-transform: uppercase;
}
a {
  color: currentColor;
}


</style>
