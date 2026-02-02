import log from 'electron-log/main.js';
import { getEnvironmentCredentials } from './credentials.js'
import apiClient from './apiClient.js';
import { authEndpoint } from './apiConstants.js'

let cachedToken = null
let tokenExpiration = null

export async function getAuthToken() {
    if (cachedToken && tokenExpiration && Date.now() < tokenExpiration) {
        log.info('using cached token');
        return cachedToken
    }

    const { apiId, apiKey } = await getEnvironmentCredentials()

    if (apiId == '' || apiKey == '') {
        const err = new Error('Missing API credentials');
        err.code = 'E_MissingApiCredentials';
        throw err;
    }

    const authResponse = await apiClient.get(`${authEndpoint}${apiId}/${apiKey}`)

    cachedToken = authResponse.data.token
    tokenExpiration = new Date(authResponse.data.expiration)

    return cachedToken

}

export function clearCachedToken() {
    log.info('clearing cached token due to updated credentials or environment change')
    cachedToken = null
    tokenExpiration = null
}