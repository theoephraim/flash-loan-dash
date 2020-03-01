const nconf = require('nconf');
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://api.etherscan.io/api',
  headers: {},
});
api.interceptors.request.use((config) => {
  config.url += `&apikey=${nconf.get('ETHERSCAN:api_key')}`;
  return config;
});


async function getContractAbi(contractAddress) {
  const result = await api.get(`?module=contract&action=getabi&address=${contractAddress}`);
  if (result.data.message === 'NOTOK') return null;
  try {
    return JSON.parse(result.data.result);
  } catch (err) {
    console.log('Parse error with ABI json:');
    console.log(result.data);
    throw err;
  }
}

module.exports = {
  getContractAbi,
};
