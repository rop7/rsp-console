const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { app, screen, ipcMain, BrowserWindow } = require('electron');

let win = null;

function createWindow() {

    win = new BrowserWindow({
        frame: false,
        transparent: true,
        icon: path.join(__dirname, './src/asset/icon.png'),
        resizable: process.env.NODE_ENV === 'development',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            sandbox: false
        }
    });

    win.loadFile('./src/index.html');
    win.setMenu(null);
    win.setBounds({ width: 750, height: 500 });

    if (process.env.NODE_ENV === 'development') {
        win.webContents.openDevTools();
    }

    return win;
}

function handleCommand(command, flag, path) {

    if (flag === '--sudo' || flag === '-s') {
        command = 'pkexec ' + command;
    }

    console.log(`Executing: ${command}`);

    win.webContents.send("command-log", `$ ${command}`);

    const commandProcess = spawn(command, {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    commandProcess.stdout.on("data", (data) => {
        win.webContents.send("command-log", data.toString().trim());
    });

    commandProcess.stderr.on("data", (data) => {
        win.webContents.send("command-log", `ERROR: ${data.toString().trim()}`);
    });

    commandProcess.on("close", (code) => {
        
        const message = code === 0 
            ? `Command completed successfully`
            : `Command failed with code ${code}`;
            
        win.webContents.send("command-log", message);

        showCustomNotification(`Command "${command}" finished`);
    });

    commandProcess.on("error", (err) => {
        win.webContents.send("command-log", `Failed to start command: ${err.message}`);
        showCustomNotification(`Failed to execute command`);
    });
}

function showCustomNotification(message) {

    const notificationWindow = new BrowserWindow({
        width: 400,
        height: 100,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    notificationWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
        <html>
            <body style="padding: 15px; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100%; color: white">
                <div style="border: 1px solid rgba(255,255,255,0.3); font-size: 14px; font-family: Helvetica, sans; padding: 15px; border-radius:10px; background-color: rgba(0, 0, 0, 0.7); ">
                    ${message} <b> ✓</b>
                </div>    
            </body>
        </html>
    `));

    const { width, height } = notificationWindow.getBounds();
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    notificationWindow.setBounds({
        x: Math.floor((screenWidth - width) / 2),
        y: Math.floor((screenHeight - height) / 2)
    });

    setTimeout(() => {
        notificationWindow.close();
        app.quit();
    }, 3000);
}

app.whenReady().then(() => {

    win = createWindow();
    
    try {

        const cliOptions = process.argv
            
        console.debug('cliOptions', cliOptions)

        if (cliOptions.includes('-h') || cliOptions.includes('--help')) {
            
            console.log("Usage: rsp-console _COMMAND_");

            console.log("Options:");
            console.log("  --sudo -s        Run command with privileges");
            console.log("  --help           Show help");
            
            app.quit();

            return;
        }

        const command = cliOptions[2],
                flag = cliOptions[3] || ''

        if (command) {
            win.webContents.once('did-finish-load', () => {
                handleCommand(command, flag);
            });
        }
    } catch (error) {
        console.error('Error handling CLI:', error);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});