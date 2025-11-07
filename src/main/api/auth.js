import axios from 'axios'

import { getEnvironmentCredentials } from './credentials.js'
import { getEnvironmentBaseURL } from './utils.js'

const authEndpoint = '/rest/api/v1/auth/'

let cachedToken = null
let tokenExpiration = null

export async function getAuthToken() {
    if (cachedToken && tokenExpiration && Date.now() < tokenExpiration) {
        console.log('using cached token')
        return cachedToken
    }

    const { apiId, apiKey } = await getEnvironmentCredentials()

    const baseURL = await getEnvironmentBaseURL()

    if (apiId == '' || apiKey == '') {
        console.error('no api id or key')
        throw new Error('API ID or Key not added for environment')
    }

    try {
        const authResponse = await axios.get(`${baseURL}${authEndpoint}${apiId}/${apiKey}`)

        cachedToken = authResponse.data.token
        tokenExpiration = new Date(authResponse.data.expiration)

        return cachedToken
    } catch (error) {
        console.error(error)
        if (error.response?.data) {
            throw new Error (`Error authenticating with e-Manifest API - reason: ${error.response.data.message}`)
        } else {
            console.error(error)
            throw new Error('Unknown authentication error')
        }
    }
}

export function clearCachedToken() {
    console.log('clearing cached token due to updated credentials or environment change')
    cachedToken = null
    tokenExpiration = null
}