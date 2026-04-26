import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { bootstrap } from './bootstrap'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.loadFile(
    path.join(__dirname, '../../src/renderer/dist/renderer/browser/index.html')
  )
}

app.whenReady().then(() => {
  bootstrap()
  createWindow()
})
