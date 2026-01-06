import path from 'path'
import { fileURLToPath } from 'url'

import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const iconTitle = 'EM_Data_Upload'

export default {
  packagerConfig: {
    asar: true,
    platform: ['win32'],
    icon: path.join(__dirname, 'build', iconTitle)
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
    },
    {
      name: '@electron-forge/maker-squirrel',
      setupIcon: path.join(__dirname, 'build', `${iconTitle}.ico`)
    }
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'USEPA',
          name: 'emanifest-data-upload'
        },
        prerelease: true,
        draft: true,
        private: false,
        authToken: process.env.GITHUB_TOKEN
      }
    }
  ],
  plugins: [
    /* {
       name: '@electron-forge/plugin-auto-unpack-natives',
       config: {},
     },*/
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};