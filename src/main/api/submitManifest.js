import axios from 'axios'

import { getAuthToken } from './auth.js'
import { getEnvironmentBaseURL } from './utils.js'

const saveEndpoint = '/rest/api/v1/emanifest/manifest/save'

export async function submitRequestsToApi(payloads) {
    const responses = [];
    for (const payload of payloads) {
        try {
            const response = await submitToApi(payload);
            responses.push(response);
        } catch (error) {
            throw error
        }
    }
    return responses;
}

export async function submitToApi(manifest) {
    const baseURL = await getEnvironmentBaseURL()
    let token
    try {
        token = await getAuthToken()
    } catch (error) {
        console.log(error)
        throw error
    }

    try {
        const saveResponse = await axios.postForm(baseURL + saveEndpoint, { manifest: JSON.stringify(manifest.payload) }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        })
        return {
            manifestId: manifest.manifestId,
            result: 'Saved',
            response: saveResponse.data
        }

    } catch (error) {
        if (error.response?.data?.operationStatus == 'Failed') {
            return {
                manifestId: manifest.manifestId,
                result: 'apiValidationError',
                response: error.response.data
            }
        } else {
            console.error(error)
            return {
                manifestId: manifest.manifestId,
                result: 'unknownApiError',
                error: 'There was an error connecting with the e-Manifest API. Please try again.'
            }
        }
    }
}
