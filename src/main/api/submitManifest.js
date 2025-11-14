import apiClient from './apiClient.js';

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

    try {
        const saveResponse = await apiClient.postForm(saveEndpoint, { manifest: JSON.stringify(manifest.payload) }, {
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
        if (error.hasOwnProperty('cause')) {
            throw error;
        }
        if (error.hasOwnProperty('operationStatus')) {
            return {
                manifestId: manifest.manifestId,
                result: 'apiValidationError',
                response: error
            }
        } else {
            return {
                manifestId: manifest.manifestId,
                result: 'unknownApiError',
                error: 'There was an error submitting to the e-Manifest API. Please try again or check logs.'
            }
        }
    }
}
