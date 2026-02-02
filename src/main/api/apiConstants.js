export const AUTH_ERROR_MESSAGES = {
    E_MissingApiCredentials: 'API ID or Key are not set for the environment. Please add under API Settings.',
    E_SecurityApiIdLocked: 'API ID is locked. You need to reset it in RCRAInfo by generating a new key.',
    E_SecurityInvalidCredentials: 'Invalid API credentials. Confirm and set API ID and Key for the environment. You can manage you can manage your API credentials in RCRAInfo.',
    E_SecurityApiInvalidCredentials:'Invalid API credentials. Confirm and set API ID and Key for the environment. You can manage you can manage your API credentials in RCRAInfo.',
    E_SecurityApiInvalidStatus: 'API ID is disabled. Account needs to be reactivated in RCRAInfo.',
    E_AuthOther: 'Unknown authentication error - please check logs'
};

export const endpoints = {
    dev: {
        baseURL: 'https://rcrainfodev.com/rcrainfo',
        loginURL: 'https://rcrainfodev.com'
    },
    preprod: {
        baseURL: 'https://rcrainfopreprod.epa.gov/rcrainfo',
        loginURL: 'https://rcrainfopreprod.epa.gov'
    },
    prod: {
        baseURL: 'https://rcrainfo.epa.gov/rcrainfoprod',
        loginURL: 'https://rcrainfo.epa.gov'
    }
}

export const authEndpoint = '/rest/api/v1/auth/'

export const saveEndpoint = '/rest/api/v1/emanifest/manifest/save'