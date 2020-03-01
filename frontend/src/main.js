import Vue from 'vue';
import Meta from 'vue-meta';

import App from './app';
import router from './router';
import store from './store';

import '@/utils/init-filters';

// register some global components
Vue.component('layout', require('./components/layout').default);
Vue.component('icon', require('./components/icon').default);
// Vue.component('popup', require('./components/popup').default);
Vue.component('markdown', require('./components/markdown').default);
Vue.component('v-button', require('./components/forms/v-button').default);
Vue.component('form-group', require('./components/forms/form-group').default);
Vue.component('form-input', require('./components/forms/form-input').default);
Vue.component('form-input-option', require('./components/forms/form-input-option').default);
Vue.component('form-row', require('./components/forms/form-row').default);
Vue.component('error-message', require('./components/error-message').default);

Vue.component('eth-address', require('./components/eth-address').default);
Vue.component('eth-amount', require('./components/eth-amount').default);

Vue.config.devtools = true;
Vue.config.productionTip = false;
Vue.use(Meta);

// netlify identity login (used for CMS) redirects back to the main page
// but we dont want to include the netlify identity widget in our public bundle
// so we redirect back to /admin/ and pass through the access token
if (window.location.hash.startsWith('#access_token=')) {
  window.location = `/admin/${window.location.hash}`;
}

window.store = store;

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app');

if (navigator.userAgent !== 'ReactSnap') {
  // TODO: initialize GA?
}
