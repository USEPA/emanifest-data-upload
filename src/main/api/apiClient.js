import axios from 'axios'
import log from 'electron-log/main.js';

import { endpoints } from './endpoints.js'
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
    const isAuthRequest = config.url.includes('/auth')

    //if not auth request get and attach token to request header
    if (!isAuthRequest) {
      try {
        const token = await getAuthToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        } else {
          return Promise.reject(new Error('Authentication token is missing.'))
        }
      } catch (error) {
        return Promise.reject(error);
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
    const requestUrl = error.config ? error.config.url : ''
    const isAuthRequest = requestUrl.includes('/auth')
   
    //handling failed auth requests and returning the error
    if (isAuthRequest) {
      return Promise.reject(new Error('Authentication failed', { cause: error.response.data }))
    }

  
    if (error.response) {
      // Server responded with a status code outside of 2xx
      log.error('Error response:', error.response.data)
      
      return Promise.reject(error.response.data)

    } else if (error.request) {
      // Request was made but no response was received
      log.error('No response received:', error.request)
    } else {
      // Something else happened in setting up the request
      log.error('Request error:', error.message)
    }
    return Promise.reject(error) // Always reject the promise for error handling
  }
);

export default apiClient