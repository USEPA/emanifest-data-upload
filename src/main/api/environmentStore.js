import Store from 'electron-store'

export const environmentStore = new Store({
    defaults: {
        env: 'preprod'
    }
})

export async function getCurrentEnv() {
    return environmentStore.get('env')
}

export function setCurrentEnv(env) {
    environmentStore.set('env', env)
}