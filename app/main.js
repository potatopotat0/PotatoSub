const { app, BrowserWindow, ipcMain, dialog, nativeTheme } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const upath = require('upath')
const userLocale = Intl.DateTimeFormat().resolvedOptions().locale;
var i18nFilePath = new String();
if (fs.existsSync(upath.toUnix(upath.join(__dirname, "assets", "i18n", `${userLocale}.json`)))) {
    i18nFilePath = upath.toUnix(upath.join(__dirname, "assets", "i18n", `${userLocale}.json`));
} else if (fs.existsSync(upath.toUnix(upath.join(__dirname, "assets", "i18n", `${userLocale.split('-')[0]}.json`)))) {
    i18nFilePath = upath.toUnix(upath.join(__dirname, "assets", "i18n", `${userLocale.split('-')[0]}.json`));
} else {
    i18nFilePath = upath.toUnix(upath.join(__dirname, "assets", "i18n", "en.json"));
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
            preload: upath.join(__dirname, 'preload.js')
        },
        icon: upath.join(__dirname, "assets", "img", "icon.ico")
    });
    nativeTheme.themeSource = 'dark';
    win.removeMenu();

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

    ipcMain.handle('dialog:customAlert', (event, title, message) => {
        dialog.showMessageBox({
            title: title,
            message: message,
            type: "warning"
        });
    })

    ipcMain.handle('dialog:customError', (event, title, message) => {
        dialog.showMessageBox({
            title: title,
            message: message,
            type: "error"
        });
    })

    //handle render request and send back terminal output
    ipcMain.handle('render:sub', (event, sourceVideoPath, sourceSubtitlePath, distPath, encodeArguments) => {
        var encoder = "ffmpeg", arch = new String();
        switch (process.platform) {
            case 'win32':  // fix Windows absolute path for ffmpeg
                sourceVideoPath = sourceVideoPath.slice(2);
                sourceSubtitlePath = sourceSubtitlePath.slice(2);
                if (process.arch === 'x64' || process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432')) arch = "windows-x64";
                else arch = "windows-ia32";
                break;
            case 'darwin':
                arch = "darwin";
                break;
            case 'linux':
                arch = `linux-${process.arch}`
                break;
            default:
                dialog.showMessageBox({
                    title: i18n("#error.title.unsupportedPlatform"),
                    message: i18n("#error.description.unsupportedPlatform", [process.platform]),
                    type: "error"
                });
                return;
        }
        if (fs.existsSync(upath.toUnix(upath.join(__dirname, "encodeTool", encoder, arch, `ffmpeg${process.platform === "win32" ? ".exe" : ""}`))) === false) {
            dialog.showMessageBox({
                title: i18n("#error.title.encoderNotFound"),
                message: i18n("#error.description.encoderNotFound", [encoder, arch]),
                type: "error"
            });
            return;
        }
        const renderWindow = new BrowserWindow({
            width: 600,
            height: 300,
            maximizable: false,
            minimizable: false,
            resizable: false,
            webPreferences: {
                preload: upath.join(__dirname, 'render_process', 'preload.js')
            },
            parent: win,
            modal: true
        });
        renderWindow.removeMenu();
        renderWindow.loadFile(upath.join(__dirname, 'render_process', 'index.htm')).then(() => {
            renderWindow.webContents.send('render-output', `Encoding started, using command:\n${execCommand}\n\n`);
        });
        const execCommand =
            upath.toUnix(upath.join(__dirname, "encodeTool", encoder, arch, `ffmpeg${process.platform === "win32" ? ".exe" : ""}`)) +
            ' -y' +
            ' -i' +
            ` "${sourceVideoPath}"` +
            ' -vf' +
            ` "subtitles='${sourceSubtitlePath}'"` +
            ` "${distPath}"`;
        // console.log(execCommand);
        var renderer = spawn(
            upath.toUnix(upath.join(__dirname, "encodeTool", encoder, arch, `ffmpeg${process.platform === "win32" ? ".exe" : ""}`)), [
            '-y',
            '-i',
            `${sourceVideoPath}`,
            '-vf',
            `subtitles='${sourceSubtitlePath}'`,
            `${distPath}`
        ]);
        const preventTerminatingRender = (event) => {
            event.preventDefault();
            dialog.showMessageBox(renderWindow, {
                title: i18n("#alert.title.eliminateRender"),
                message: i18n("#alert.description.eliminateRender"),
                type: "warning",
                noLink: true,
                buttons: [i18n("#action.run.confirm"), i18n("#action.run.cancel")],
                defaultId: 1
            }).then((result) => {
                if (result.response === 0) {
                    renderer.kill('SIGINT');
                    setTimeout(() => { renderWindow.destroy(); }, 500);
                }
            }).catch((err) => { throw err });
        }
        renderWindow.on('close', preventTerminatingRender);
        renderer.stderr.on('data', function (data) {
            renderWindow.webContents.send('render-output', data.toString());
        });
        renderer.on('exit', function (code) {
            renderWindow.webContents.send('render-output', "\nRender ended.");
            renderWindow.webContents.send('render-finished');
            renderWindow.removeListener("close", preventTerminatingRender);
        });
        return "Render task sent";
    });

    win.loadFile(upath.join(__dirname, 'index.htm'));

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