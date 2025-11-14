
import { safeStorage } from 'electron'
import Store from 'electron-store';

import { getCurrentEnv } from './environmentStore.js'

const credStore = new Store({ name: 'credentials' })

export async function saveCredentials(env, apiId, apiKey) {
    const encrypted = {
        apiId: encryptString(apiId),
        apiKey: encryptString(apiKey)
    }

    credStore.set(env, encrypted)
}

export async function getEnvironmentCredentials() {
    const currentEnv = await getCurrentEnv()
    const stored = credStore.get(currentEnv)

    if (!stored) {
        return { apiId: '', apiKey: '' }
    }

    return {
        apiId: decryptString(stored.apiId),
        apiKey: decryptString(stored.apiKey)
    }
}

function encryptString(value) {
    return safeStorage.encryptString(value).toString('base64')
}

function decryptString(value) {
    return safeStorage.decryptString(Buffer.from(value, 'base64'))
}