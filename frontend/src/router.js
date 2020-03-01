import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

export default new Router({
  mode: window.location.host.includes('arweave') ? 'hash' : 'history',
  // base: process.env.BASE_URL,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { x: 0, y: 0 };
  },
  routes: [
    // pages
    { path: '/', name: 'home', component: require('./pages/home').default },
    { path: '/about', name: 'about', component: require('./pages/about').default },
    { path: '*', name: 'not-found', component: require('./pages/404').default },
  ],
});
