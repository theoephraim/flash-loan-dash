/* eslint-disable no-param-reassign */

import Vue from 'vue';

import _ from 'lodash';
import formatDate from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import ago from './s-ago';
// import filesize from 'filesize';

import { formatMoney } from '@/utils/currency';


console.log('FILTERS');

function parseAndFormatDate(dateOrDateStr, format) {
  if (_.isDate(dateOrDateStr)) return formatDate(dateOrDateStr, format);
  // try and parse a time only string, ie '09:00'
  if (dateOrDateStr.length === 5 && dateOrDateStr.includes(':')) {
    return formatDate(parseISO(`2019-01-01 ${dateOrDateStr}`), format);
  }
  return formatDate(parseISO(dateOrDateStr), format);
}

Vue.filter('currency', formatMoney);

// return up to 2 decimals
// the "+" will get rid of unnecessary trailing zeros
Vue.filter('percent', (value) => `${+(value * 100).toFixed(2)}%`);

Vue.filter('friendly-date', (value) => {
  if (!value) return '---';
  return parseAndFormatDate(value, 'MMMM do, yyyy');
});

Vue.filter('day', (value) => {
  if (!value) return '---';
  return parseAndFormatDate(value, 'iii');
});
Vue.filter('date', (value, format = 'yyyy-MM-dd') => {
  if (!value) return '---';
  return parseAndFormatDate(value, format);
});
Vue.filter('datetime', (value) => {
  if (!value) return '---';
  return parseAndFormatDate(value, 'yyyy-MM-dd @ h:mma');
});
Vue.filter('time', (value) => {
  if (!value) return '---';
  return parseAndFormatDate(value, 'h:mma');
});
Vue.filter('timeago', (value) => {
  if (!value) return '---';
  if (_.isDate(value)) return ago(value);
  return ago(new Date(value));
});

Vue.filter('th', (value) => {
  if (!value) return '';
  const int = parseInt(value);
  const lastDigit = int % 10;
  if (int > 10 && int < 20) return 'th';
  if (lastDigit === 0) return 'th';
  if (lastDigit === 1) return 'st';
  if (lastDigit === 2) return 'nd';
  if (lastDigit === 3) return 'rd';
  return 'th';
});

// Vue.filter('daysago', (value) => {
//   if (!value) return '---';
//   const date = _.isDate(value) ? value : new Date(value);
// });


// Vue.filter('filesize', (value) => {
//   if (!value) return '---';
//   return filesize(value, { round: 1 });
// });

Vue.filter('capitalize', (value) => {
  if (!value) return '---';
  return value.charAt(0).toUpperCase() + value.slice(1);
});

Vue.filter('desnake', (value) => value.split('_').join(' '));

Vue.filter('dec', (value, numDecimals) => value / (10 ** numDecimals));
