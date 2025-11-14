import log from 'electron-log/main.js';
import { getEnvironmentCredentials } from './credentials.js'
import apiClient from './apiClient.js';

const authEndpoint = '/rest/api/v1/auth/'

let cachedToken = null
let tokenExpiration = null

export async function getAuthToken() {
    if (cachedToken && tokenExpiration && Date.now() < tokenExpiration) {
        log.info('using cached token');
        return cachedToken
    }

    const { apiId, apiKey } = await getEnvironmentCredentials()

    if (apiId == '' || apiKey == '') {
        log.error('no api id or key for environment')
        throw new Error('Missing API credentials', { cause: { code: 'E_MissingApiCredentials' } })
    }

    try {
        const authResponse = await apiClient.get(`${authEndpoint}${apiId}/${apiKey}`)

        cachedToken = authResponse.data.token
        tokenExpiration = new Date(authResponse.data.expiration)

        return cachedToken
    } catch (error) {
        throw error
    }
}

export function clearCachedToken() {
    log.info('clearing cached token due to updated credentials or environment change')
    cachedToken = null
    tokenExpiration = null
}