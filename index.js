const { app, BrowserWindow, ipcMain, dialog, BrowserView } = require('electron')
const path = require('path')

// optimization, optifine, util, flagpvp addons
let willInstall = [true, false, true, true]

// 1181, 1171
let version = [true, false]

const createWindow = () => {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      frame: false,
      backgroundColor: '#FFF',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    })

    win.on('maximize', (evt, isAlwaysOnTop) => {
        win.webContents.send('maxReply', true)
    })

    win.on('unmaximize', (evt, isAlwaysOnTop) => {
        win.webContents.send('unmaxReply', false)
    })
  
    win.loadFile('index.html')
}

/*
<label class="container">FlagPvP Addon
  <input type="checkbox">
  <span class="checkmark"></span>
</label>
*/

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('setMod', (evt, arg) => {
    willInstall = arg
})

ipcMain.on('getMod', (evt, arg) => {
    evt.reply('gotMod', willInstall)
})

ipcMain.on('setVersion', (evt, arg) => {
    console.log('Set version with: ' + arg)
    version = arg
})

ipcMain.on('getVersion', (evt, arg) => {
    evt.reply('gotVersion', version)
})

ipcMain.on('goTo', (evt, arg) => {
    BrowserWindow.getFocusedWindow().loadFile(arg)
})

ipcMain.on('close', (evt, payload) => {
    var window = BrowserWindow.getFocusedWindow();
    window.close();
})

ipcMain.on('max', (evt, payload) => {
    console.log('max')
    var window = BrowserWindow.getFocusedWindow();
    window.maximize()
    evt.reply('maxReply', true)
})

ipcMain.on('unmax', (evt, payload) => {
    console.log('unmax')
    var window = BrowserWindow.getFocusedWindow();
    window.unmaximize()
    evt.reply('unmaxReply', false)
})

ipcMain.on('min', (evt, payload) => {
    var window = BrowserWindow.getFocusedWindow();
    window.minimize();
})

ipcMain.on('fine', (evt, payload) => {
    dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
        type: 'info',
        message: '모든 설치가 완료되었습니다!'
    }).then((act) => {
        process.exit(0)
    })
})

ipcMain.on('error', (evt, payload, payload2) => {
    dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
        type: 'error',
        message: '설치 도중 오류가 발생하였습니다!\n' + payload
    }).then((act) => {
        console.log(payload2)
        if(payload2) process.exit(0)
    })
})

app.whenReady().then(() => {
    createWindow()
  
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})