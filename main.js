// main.js
const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')));

// 确保 data 和 exported_data 文件夹存在
const dataDir = path.join(__dirname, 'data');
const exportedDataDir = path.join(__dirname, 'exported_data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
if (!fs.existsSync(exportedDataDir)) {
  fs.mkdirSync(exportedDataDir);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');

  // 定义菜单
  const menuTemplate = [
    {
      label: '文件',
      submenu: [
        {
          label: '导入数据',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            win.webContents.send('open-import-data');
          }
        },
        {
          label: '导出数据',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            win.webContents.send('open-export-data');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        {
          label: '撤销',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: '重做',
          accelerator: 'CmdOrCtrl+Y',
          role: 'redo'
        },
        { type: 'separator' },
        {
          label: '剪切',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: '复制',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: '粘贴',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于软件',
          click: () => {
            win.webContents.send('open-about-software', {
              appVersion: packageJson.version,
              electronVersion: process.versions.electron,
            });
          }
        },
        {
          label: '关于作者',
          click: () => {
            win.webContents.send('open-about-author');
          }
        }
      ]
    }
  ];

  // macOS 平台添加应用菜单
  if (process.platform === 'darwin') {
    menuTemplate.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  // 创建并设置菜单
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// 自动读取最新文件
function loadLatestData() {
  try {
    const files = fs.readdirSync(dataDir).filter(file => file.startsWith('data_') && file.endsWith('.json'));
    if (files.length === 0) {
      // 创建空文件
      const now = new Date();
      const timestamp = now.getFullYear().toString() +
        ('0' + (now.getMonth() + 1)).slice(-2) +
        ('0' + now.getDate()).slice(-2) +
        ('0' + now.getHours()).slice(-2) +
        ('0' + now.getMinutes()).slice(-2) +
        ('0' + now.getSeconds()).slice(-2);
      const filePath = path.join(dataDir, `data_${timestamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    // 按文件名排序，获取最新文件
    const latestFile = files.sort().pop();
    const filePath = path.join(dataDir, latestFile);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data;
  } catch (error) {
    // 创建空文件
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      ('0' + (now.getMonth() + 1)).slice(-2) +
      ('0' + now.getDate()).slice(-2) +
      ('0' + now.getHours()).slice(-2) +
      ('0' + now.getMinutes()).slice(-2) +
      ('0' + now.getSeconds()).slice(-2);
    const filePath = path.join(dataDir, `data_${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
}

// 处理自动保存文件
ipcMain.on('save-data', (event, devices) => {
  try {
    // 生成时间戳，格式为 YYYYMMDDHHMMSS
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      ('0' + (now.getMonth() + 1)).slice(-2) +
      ('0' + now.getDate()).slice(-2) +
      ('0' + now.getHours()).slice(-2) +
      ('0' + now.getMinutes()).slice(-2) +
      ('0' + now.getSeconds()).slice(-2);
    const savePath = path.join(dataDir, `data_${timestamp}.json`);
    fs.writeFileSync(savePath, JSON.stringify(devices, null, 2), 'utf-8');
  } catch (error) {
  }
});

// 处理导入文件
ipcMain.on('import-data', (event) => {
  dialog.showOpenDialog({
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile']
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const filePath = result.filePaths[0];
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        event.reply('import-data-result', { success: true, data, message: '导入数据成功' });
      } catch (error) {
        event.reply('import-data-result', { success: false, message: '导入数据失败：无法读取文件' });
      }
    } else {
      event.reply('import-data-result', { success: false, message: '导入数据取消' });
    }
  });
});

// 处理导出文件
ipcMain.on('export-data', (event, devices) => {
  try {
    // 生成时间戳，格式为 YYYYMMDDHHMMSS
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      ('0' + (now.getMonth() + 1)).slice(-2) +
      ('0' + now.getDate()).slice(-2) +
      ('0' + now.getHours()).slice(-2) +
      ('0' + now.getMinutes()).slice(-2) +
      ('0' + now.getSeconds()).slice(-2);
    const exportPath = path.join(exportedDataDir, `data_${timestamp}.json`);
    fs.writeFileSync(exportPath, JSON.stringify(devices, null, 2), 'utf-8');
    shell.openPath(exportedDataDir);
    event.reply('export-data-result', { success: true, message: '导出数据成功' });
  } catch (error) {
    event.reply('export-data-result', { success: false, message: '导出数据失败：无法写入文件' });
  }
});

app.whenReady().then(() => {
  createWindow();
  // 自动读取数据并发送到渲染进程
  const initialData = loadLatestData();
  if (initialData) {
    BrowserWindow.getAllWindows()[0].webContents.send('load-initial-data', initialData);
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});