<template lang='pug'>
.main-layout()
  .flex-wrap
    .header-bar
      router-link.main-logo(to='/')
        //- logo
        h1 ✨🤑📈 FlashLoanWatch.xyz
  .main-content
    slot
</template>

<script>
const components = {
  // logo: require('@/assets/images/logo.svg?inline').default,
  'facebook-logo': require('@/assets/images/facebook.svg?inline').default,
  'instagram-logo': require('@/assets/images/instagram.svg?inline').default,
};

export default {
  components,
  metaInfo() {
    return {
      style: [{ type: 'text/css', cssText: this.themeStyles }],
    };
  },
  props: {
  },
  computed: {
  },
  methods: {
  },
};
</script>

<style lang="less">
body {
  background-color: #171717;
}
.main-layout {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  color: #DDD;

  > .flex-wrap {
    flex: 1 0 auto;
  }
  .main-content {
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
    padding: 15px;
    padding-top: 60px;
    padding-bottom:0px;
    // background-color: #171717;

    // @media @mq-small-only {
    //   padding-top: @header-bar-height--mobile;
    // }
  }
}

.header-bar {
  // display: flex;
  align-items: center;
  background:#000;
  color: #FFF;
  height: @header-bar-height--desktop;
  padding: 10px;
  text-align: center;
  position: fixed;
  z-index: 1000;
  width: 100%;
  h1 {
    margin: 0;
    padding: 0;
    display: block;
  }

  @media @mq-small-only {
    height: @header-bar-height--mobile;
  }
}

// .header-bar {
//   background: #000;
//   color: #FFF;
//   width: 100%;
//   height: 60px;
//   padding: 10px;
//   // display: flex;
//   // justify-content: space-between;
//   // align-items: center;
//   text-align: center;
//   overflow: hidden;
//   h1 {
//     margin: 0;
//     padding: 0;
//     display: block;
//   }
// }
.main-logo {
//   height: 100%;
//   display: flex;
//   justify-content: flex-start;
//   align-content: center;
  text-decoration: none;
  color: currentColor;
//   &:hover {
//     color: @brand-color;
  }

//   h1 {
//     display: inline-block;
//     padding-left: 10px;
//   }
//   svg {
//     display: inline-block;
//     height: 100%;
//     width: auto;
//     fill: currentColor;
//   }
// }

.footer {
  background: #171717;
  width: 100%;
  height: 100px;
  padding: 20px;
  display: flex;
  justify-content: space-evenly;
}

</style>
