/*
  Helpers to deal with showing appropriate labels and options for selected
  country and state.
*/

import _ from 'lodash';
import statesByCountry from '@/data/states-by-country';

export const countriesWithStateOptions = Object.keys(statesByCountry);
export function stateOptionsForCountry(countryCode) {
  if (!countryCode) return [];
  return statesByCountry[countryCode];
}

export function postalCodeLabel(countryCode) {
  return countryCode === 'US' ? 'Zip Code' : 'Postal Code';
}

export function stateLabel(countryCode) {
  return {
    US: 'State',
    CA: 'Province',
  }[countryCode] || 'Province';
}

export function stateLabelAdjective(countryCode) {
  return {
    US: 'State',
    CA: 'Provincial',
  }[countryCode] || 'Provincial';
}
