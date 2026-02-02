import axios from 'axios'
import log from 'electron-log/main.js';

import { endpoints, AUTH_ERROR_MESSAGES } from './apiConstants.js'
import { getCurrentEnv } from './environmentStore.js'
import { getAuthToken } from './auth.js'

const apiClient = axios.create({
  timeout: 10000
})

apiClient.interceptors.request.use(
  async (config) => {
    //set the baseURL for the current environment
    const currentEnv = await getCurrentEnv()
    config.baseURL = endpoints[currentEnv].baseURL

    //check if auth request
    const url = String(config.url || '');
    const isAuthRequest = url.includes('/auth')

    //ensure headers exists
    config.headers = config.headers || {};

    //if not auth request get and attach token to request header
    if (!isAuthRequest) {
      try {
        const token = await getAuthToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        } else {
          const err = new Error('Authentication token is missing.');
          err.code = 'E_MissingApiCredentials';
          throw err;
        }
      } catch (error) {
        if (!error.code) {
          error.code = 'E_MissingApiCredentials';
        }
        throw error;
      }
    }
    return config

  },
  (error) => Promise.reject(error))

apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    //check if auth request
    const requestUrl = error?.config?.url ?? '';
    const isAuthRequest = requestUrl.includes('/auth');

    const data = error?.response?.data;

    // If an upstream error already has a known auth code, pass it through without relogging as setup
    if (Object.hasOwn(AUTH_ERROR_MESSAGES, error?.code)) {
      return Promise.reject(error);
    }

    //auth errors
    if (isAuthRequest) {
      const apiCode = data?.code ?? data?.ErrorCode ?? data?.errorCode;

      console.log('is auth requests')
      console.log('apiCode', apiCode)

      //check for standard auth error codes - otherwise return E_AuthOther
      let code = Object.hasOwn(AUTH_ERROR_MESSAGES, apiCode) ? apiCode : 'E_AuthOther';

      const err = new Error('Authentication failed');
      err.code = code;
      return Promise.reject(err);
    }

    //non-auth errors, outside 2xx codes
    if (error.response) {
      log.error('API validation error')
      const err = new Error('API validation error');
      err.code = 'apiValidationError';
      err.data = data;
      return Promise.reject(err);
    }

    // Request was made but no response was received
    if (error.request) {
      log.error('No response received:', { message: error.message })
      const networkCode = error.code; // e.g., ECONNABORTED, ERR_NETWORK
      const syntheticData = {
        code: 'apiNetworkError',
        message: 'No response received from API',
        networkCode
      }
      const err = new Error('No response received from API');
      err.data = syntheticData
      return Promise.reject(err);
    }

    //setup error
    log.error('Request setup error', { message: error.message });

    const err = new Error(error.message || 'Request setup error');
    err.code = error.code || 'E_RequestSetup';
    err.status = null;
    err.data = { message: err.message };
    return Promise.reject(err);

  }
);

export default apiClient