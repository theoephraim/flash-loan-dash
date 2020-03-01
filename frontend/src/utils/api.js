/* eslint-disable no-param-reassign */

import Axios from 'axios';

const api = Axios.create({
  timeout: process.env.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  baseURL: '/api',
});
window.api = api; // useful for dev

// api.interceptors.request.use((config) => {
//   if (window.store.state.auth.token) {
//     config.headers['x-auth'] = window.store.state.auth.token;
//   }
//   return config;
// });
// api.interceptors.response.use(response => response);

export default api;
