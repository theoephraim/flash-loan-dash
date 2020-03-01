const nconf = require('nconf');
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://web3api.io/api/v2/',
  headers: {
    'x-amberdata-blockchain-id': 'ethereum-mainnet',
    'x-api-key': nconf.get('AMBERDATA:api_key'),
    // 'content-type': 'application/json',
  },
});

async function getTransactionsForAddress(address) {
  const result = await api.get(`/addresses/${address}/transactions`);
  return result.data.payload;
}

async function getTransaction(txHash) {
  const result = await api.get(`/transactions/${txHash}`);
  return result.data.payload;
}

async function getTokenPriceHistory(tokenAddress) {
  const result = await api.get([
    `/market/tokens/prices/${tokenAddress}/historical?`,
    'timeformat=iso861',
    '&timeInterval=d',
    // '&startDate=2020-01-01',
  ].join(''));
  return result.data.payload;
}

module.exports = {
  getTransactionsForAddress,
  getTransaction,
  getTokenPriceHistory,
};
