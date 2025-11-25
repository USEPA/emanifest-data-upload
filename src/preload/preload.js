const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    selectExcelFile: () => ipcRenderer.invoke('select-xlsx-file'),
    submitAllData: (filePath) => ipcRenderer.invoke('submit-all-data', filePath),
    getEnv: () => ipcRenderer.invoke('settings:get-env'),
    setEnv: (env) => ipcRenderer.invoke('settings:set-env', env),
    openUrl: (url) => ipcRenderer.send('open-url', url),
    credentials: {
        set: (env, apiId, apiKey) => ipcRenderer.invoke('credentials:set', env, apiId, apiKey),
        get: (env) => ipcRenderer.invoke('credentials:get', env)
    },
    envUrl: {
        get: (env) => ipcRenderer.invoke('envUrl:get', env)
    },
    devEnv: {
        get: () => ipcRenderer.invoke('check-dev')
    }
})