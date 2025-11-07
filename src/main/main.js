import { app, BrowserWindow, ipcMain, dialog, shell, safeStorage } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import Store from 'electron-store';
import { clearCachedToken } from './api/auth.js'
import { endpoints } from './api/utils.js';
import { processSubmitBulkData } from './processing/manager.js';
import { saveCredentials, getEnvironmentCredentials } from './api/credentials.js';


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

//used for environment URLs, user-supplied api credentials and data on UI
const store = new Store({
    defaults: {
        env: 'preprod'
    }
})

//get the current environment
ipcMain.handle('settings:get-env', () => store.get('env'))

//sets the environment
ipcMain.handle('settings:set-env', (_, env) => {
    if (!['dev', 'preprod', 'prod'].includes(env)) {
        throw new Error(`Invalid environment: ${env}`)
    }
    store.set('env', env)
    clearCachedToken()
    return env
})
//get login URL for an environment
ipcMain.handle('envUrl:get', async (_, env) => {
    return endpoints[env].loginURL
})

//credentials
ipcMain.handle('credentials:set', async (_, env, apiId, apiKey) => {
    await saveCredentials(env, apiId, apiKey)
    clearCachedToken()
    return true
})

ipcMain.handle('credentials:get', async (_) => {
    const creds = await getEnvironmentCredentials()
    return creds
})

//selecting XLSX file
ipcMain.handle('select-xlsx-file', async () => {
    const { cancelled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'XLSX File', extensions: ['xlsx'] }]
    })
    if (cancelled || filePaths.length === 0) return null
    return filePaths[0]
})

//handles submit logic for All data option
ipcMain.handle('submit-all-data', async (_, filePath) => {
    try {
        const result = await processSubmitBulkData(filePath)
        return result

    } catch (error) {
        console.error('main js returning')
        return {
            result: 'systemError',
            message: error.message
        }
    }
})

//returns current api config
export async function getCurrentEnv() {
    return store.get('env')
}

//handles opening client side URLs in default browser
ipcMain.on('open-url', (_, url) => {
    shell.openExternal(url)
})

const isDev = !app.isPackaged

ipcMain.handle('check-dev', () => ({ dev: isDev }))

//launches the window
function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        minWidth: 700,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
}
app.whenReady().then(createWindow)

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});