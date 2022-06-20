const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const { type } = require('os');
const userLocale = Intl.DateTimeFormat().resolvedOptions().locale;
var i18nFilePath = new String();
if (fs.existsSync(`i18n\\${userLocale}.json`)) {
    i18nFilePath = `i18n\\${userLocale}.json`;
} else if (fs.existsSync(`i18n\\${userLocale.split('-')[0]}.json`)) {
    i18nFilePath = `i18n\\${userLocale.split('-')[0]}.json`;
} else {
    i18nFilePath = 'i18n\\en-US.json';
}
const i18nmapping = JSON.parse(fs.readFileSync(i18nFilePath));

function i18n(key, arg = []) {
    // console.log(i18nmapping);
    if (i18nmapping.hasOwnProperty(key) == false) {
        return key;
    }
    var rt = i18nmapping[key];
    for (var k in arg) {
        rt = rt.replaceAll(`$${k}`, arg[k]);
    }
    return rt;
}

if (!String.prototype.insert) {
    String.prototype.insert = function (dist, index) {
        if (index < 0) index = this.length + index;
        return this.slice(0, index) + dist + this.slice(index);
    }
}

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 450,
        minWidth: 930,
        minHeight: 650,
        webPreferences: {
            preload: path.join(__dirname, 'preload_index.js')
        }
    });

    ipcMain.handle('i18n:query', async (event, key, arg = []) => {
        var rt = i18n(key, arg);
        return rt;
    })

    ipcMain.handle('dialog:openVideo', async (event) => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            filters: [
                { name: 'Video', extensions: ['mp4', 'mkv', 'flv', 'mov', 'mkv', '264', 'h264', 'hevc'] }
            ],
            properties: ['openFile']
        });
        if (canceled) {
            return false;
        } else {
            return filePaths[0];
        }
    })

    ipcMain.handle('dialog:openSub', async (event) => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            filters: [
                { name: 'Subtitle', extensions: ['ass', 'srt'] }
            ],
            properties: ['openFile']
        });
        if (canceled) {
            return false;
        } else {
            return filePaths[0];
        }
    })
    ipcMain.handle('dialog:saveOutput', async (event, extension) => {
        const { canceled, filePaths } = await dialog.showSaveDialog({
            defaultPath: "output",
            filters: [
                { name: 'Video', extensions: [['mp4', 'mkv', 'flv', 'mov', 'mkv', '264', 'h264', 'hevc'].includes(extension) ? extension : "mp4"] }
            ],
            properties: ['openFile']
        });
        if (canceled) {
            return false;
        } else {
            return filePaths[0];
        }
    })
    //handle render request and send back terminal output
    ipcMain.handle('render:sub', (event, sourceVideoPath, sourceSubtitlePath, distPath, encodeArguments) => {
        var encoder = "ffmpeg", arch = new String();
        switch (process.platform) {
            case 'win32':  // fix Windows absolute path for ffmpeg
                sourceVideoPath = sourceVideoPath.slice(2);
                sourceSubtitlePath = sourceSubtitlePath.slice(2);
                if (process.arch === 'x64' || process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432')) arch = "win-amd64";
                else arch = "win-i386";
                break;
            case 'darwin':
                arch = "darwin";
                break;
            case 'linux':
                if (process.arch === 'x64') arch = "linux-amd64";
                else arch = "linux-i386";
                break;
            default:
                dialog.showErrorBox(i18n("#error.title.unsupportedPlatform"), i18n("#error.description.unsupportedPlatform", [process.platform]));
                return;
        }
        const renderWindow = new BrowserWindow({
            width: 600,
            height: 300,
            maximizable: false,
            minimizable: false,
            resizable: false,
            webPreferences: {
                preload: path.join(__dirname, 'preload_render.js')
            }
        });
        renderWindow.removeMenu();
        renderWindow.loadFile('render_progress.htm').then(() => {
            renderWindow.webContents.send('render-output', `Encoding started, using command:\n${execCommand}\n\n`);
        });
        const execCommand =
            `./encodeTool/${encoder}/${arch}/ffmpeg.exe`.replaceAll('/', process.platform == "win32" ? '\\' : '/') +
            ' -y' +
            ' -i' +
            ` "${sourceVideoPath}"` +
            ' -vf' +
            ` "subtitles='${sourceSubtitlePath}'"` +
            ` "${distPath}"`;
        // console.log(execCommand);
        var renderer = exec(execCommand);
        renderer.stderr.on('data', function (data) {
            renderWindow.webContents.send('render-output', data.toString());
        });
        renderer.on('exit', function (code) {
            renderWindow.webContents.send('render-output', "\nRender ended.");
            renderWindow.webContents.send('render-finished');
        });
        return "Render task sent";
    });

    win.loadFile('index.htm');

    // win.webContents.openDevTools();
}


app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
})