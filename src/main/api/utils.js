import { getCurrentEnv } from '../main.js'

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

export async function getEnvironmentBaseURL() {
    const currentEnv = await getCurrentEnv()
    return endpoints[currentEnv].baseURL
}