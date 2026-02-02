import apiClient from './apiClient.js';
import { saveEndpoint } from './apiConstants.js';

export async function submitRequestsToApi(payloads) {
    const responses = [];
    for (const payload of payloads) {
        const response = await submitToApi(payload);
        responses.push(response);
    }
    return responses;
}

export async function submitToApi(manifest) {

    try {
        const saveResponse = await apiClient.postForm(
            saveEndpoint,
            { manifest: JSON.stringify(manifest.payload) },
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
        return {
            manifestId: manifest.manifestId,
            result: 'Saved',
            response: saveResponse.data
        }

    } catch (error) {
        //if manifest validation failed return the error
        if (error.code === 'apiValidationError') {
            return {
                manifestId: manifest.manifestId,
                result: 'apiValidationError',
                response: error.data
            }
        }
        //in all other cases stop processing and throw error (i.e. authentications issues)
        throw error;
    }
}
