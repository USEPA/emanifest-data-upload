console.log('Preload script is loading...');

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    selectExcelFile: () => ipcRenderer.invoke('select-xlsx-file'),
    submitAllData: (filePath) => ipcRenderer.invoke('submit-all-data', filePath),
    getEnv: () => ipcRenderer.invoke('settings:get-env'),
    setEnv: (env) => ipcRenderer.invoke('settings:set-env', env),
    openUrl: (url) => ipcRenderer.send('open-url', url)
})

contextBridge.exposeInMainWorld('apiCredentials', {
    set: (env, apiId, apiKey) => ipcRenderer.invoke('credentials:set', env, apiId, apiKey),
    get: (env) => ipcRenderer.invoke('credentials:get', env),
})

contextBridge.exposeInMainWorld('envUrl', {
    get: (env) => ipcRenderer.invoke('envUrl:get', env),
})

contextBridge.exposeInMainWorld('env', {
    get: () => ipcRenderer.invoke('check-dev')
})

/*contextBridge.exposeInMainWorld('axeElectron', {
  runAccessibilityChecks: async () => {
    // axe.run() automatically checks the entire document and returns a report
    const results = await axe.run(document);
    return results;
  }
});*/

try {
  // Attempt to require axe-core
  const axe = require('axe-core');

  contextBridge.exposeInMainWorld('axeAPI', {
    run: (context = document, options = {}) => {
      return new Promise((resolve, reject) => {
        axe.run(context, options, (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve(results);
        });
      });
    }
  });

  console.log('axe-core loaded successfully.');

} catch (err) {
  console.error('Error loading axe-core:', err);
}