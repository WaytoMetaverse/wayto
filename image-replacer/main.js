const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;
const projectRoot = path.resolve(__dirname, '..');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // 允許載入本地文件
    },
    icon: path.join(projectRoot, 'LOGO2.png')
  });

  mainWindow.loadFile('index.html');

  // 開發模式下打開開發者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC處理器：選擇圖片或視頻文件
ipcMain.handle('select-image', async (event, allowVideo = false) => {
  const filters = [
    { name: '圖片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
  ];
  
  if (allowVideo) {
    filters.push({ name: '視頻', extensions: ['mp4', 'webm', 'ogg', 'mov'] });
    filters.push({ name: '所有媒體文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'ogg', 'mov'] });
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// IPC處理器：讀取圖片配置
ipcMain.handle('get-image-config', async () => {
  const configPath = path.join(__dirname, 'image-config.json');
  const config = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(config);
});

// IPC處理器：檢查圖片或視頻是否存在
ipcMain.handle('check-image-exists', async (event, filePath) => {
  const fullPath = path.join(projectRoot, filePath);
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
});

// IPC處理器：檢查視頻是否存在
ipcMain.handle('check-video-exists', async (event, videoPath) => {
  const fullPath = path.join(projectRoot, videoPath);
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
});

// IPC處理器：複製圖片文件
ipcMain.handle('copy-image', async (event, sourcePath, targetPath) => {
  const source = sourcePath;
  const target = path.join(projectRoot, targetPath);
  
  // 確保目標目錄存在
  const targetDir = path.dirname(target);
  await fs.mkdir(targetDir, { recursive: true });
  
  // 複製文件
  await fs.copyFile(source, target);
  return true;
});

// IPC處理器：批量複製圖片
ipcMain.handle('copy-images-batch', async (event, imageMappings) => {
  const results = [];
  
  for (const mapping of imageMappings) {
    try {
      const target = path.join(projectRoot, mapping.targetPath);
      const targetDir = path.dirname(target);
      await fs.mkdir(targetDir, { recursive: true });
      await fs.copyFile(mapping.sourcePath, target);
      results.push({ success: true, targetPath: mapping.targetPath });
    } catch (error) {
      results.push({ 
        success: false, 
        targetPath: mapping.targetPath, 
        error: error.message 
      });
    }
  }
  
  return results;
});

// IPC處理器：獲取HTML文件路徑（用於預覽）
ipcMain.handle('get-html-path', async (event, htmlFile) => {
  return path.join(projectRoot, htmlFile);
});

// 720° 環景外部網址：讀取 / 寫入 data/panoramic-embeds.json
const panoramicEmbedsPath = path.join(projectRoot, 'data', 'panoramic-embeds.json');

ipcMain.handle('get-panoramic-embeds', async () => {
  try {
    const data = await fs.readFile(panoramicEmbedsPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { 'service-panoramic-1': '', 'service-panoramic-2': '', 'service-panoramic-3': '' };
  }
});

ipcMain.handle('set-panoramic-embed', async (event, id, url) => {
  let embeds = {};
  try {
    const data = await fs.readFile(panoramicEmbedsPath, 'utf-8');
    embeds = JSON.parse(data);
  } catch {
    embeds = { 'service-panoramic-1': '', 'service-panoramic-2': '', 'service-panoramic-3': '' };
  }
  embeds[id] = (url || '').trim();
  await fs.mkdir(path.dirname(panoramicEmbedsPath), { recursive: true });
  await fs.writeFile(panoramicEmbedsPath, JSON.stringify(embeds, null, 2), 'utf-8');
  return true;
});

// 一次寫入全部環景網址（供「確認並替換」時套用）
ipcMain.handle('write-panoramic-embeds', async (event, embeds) => {
  const data = embeds && typeof embeds === 'object'
    ? { 'service-panoramic-1': '', 'service-panoramic-2': '', 'service-panoramic-3': '', ...embeds }
    : { 'service-panoramic-1': '', 'service-panoramic-2': '', 'service-panoramic-3': '' };
  await fs.mkdir(path.dirname(panoramicEmbedsPath), { recursive: true });
  await fs.writeFile(panoramicEmbedsPath, JSON.stringify(data, null, 2), 'utf-8');
  return true;
});

// 作品集：讀取 / 寫入 data/portfolio.json
const portfolioPath = path.join(projectRoot, 'data', 'portfolio.json');

ipcMain.handle('get-portfolio', async () => {
  try {
    const data = await fs.readFile(portfolioPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { categories: [], items: [] };
  }
});

ipcMain.handle('save-portfolio', async (event, data) => {
  await fs.mkdir(path.dirname(portfolioPath), { recursive: true });
  await fs.writeFile(portfolioPath, JSON.stringify(data, null, 2), 'utf-8');
  return true;
});

// 多選圖片（僅圖片）
ipcMain.handle('select-multiple-images', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '圖片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths;
  }
  return [];
});

// 多選影片
ipcMain.handle('select-multiple-videos', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '影片', extensions: ['mp4', 'webm', 'ogg', 'mov'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths;
  }
  return [];
});

// 複製多張圖片到作品集項目目錄（images/portfolio/items/{itemId}/1.jpg, 2.jpg, ...）
ipcMain.handle('copy-portfolio-images', async (event, sourcePaths, itemId) => {
  if (!Array.isArray(sourcePaths) || sourcePaths.length === 0 || !itemId) return [];
  const itemDir = path.join(projectRoot, 'images', 'portfolio', 'items', itemId);
  await fs.mkdir(itemDir, { recursive: true });
  const relativePaths = [];
  for (let i = 0; i < sourcePaths.length; i++) {
    const ext = path.extname(sourcePaths[i]).toLowerCase() || '.jpg';
    const targetName = (i + 1) + ext;
    const targetPath = path.join(itemDir, targetName);
    await fs.copyFile(sourcePaths[i], targetPath);
    relativePaths.push('images/portfolio/items/' + itemId + '/' + targetName);
  }
  return relativePaths;
});

// 複製多支影片到作品集項目目錄（images/portfolio/items/{itemId}/1.mp4, 2.mp4, ...）
ipcMain.handle('copy-portfolio-videos', async (event, sourcePaths, itemId) => {
  if (!Array.isArray(sourcePaths) || sourcePaths.length === 0 || !itemId) return [];
  const itemDir = path.join(projectRoot, 'images', 'portfolio', 'items', itemId);
  await fs.mkdir(itemDir, { recursive: true });
  const relativePaths = [];
  for (let i = 0; i < sourcePaths.length; i++) {
    const ext = path.extname(sourcePaths[i]).toLowerCase() || '.mp4';
    const targetName = 'v' + (i + 1) + ext;
    const targetPath = path.join(itemDir, targetName);
    await fs.copyFile(sourcePaths[i], targetPath);
    relativePaths.push('images/portfolio/items/' + itemId + '/' + targetName);
  }
  return relativePaths;
});

// IPC處理器：讀取圖片或視頻數據（用於預覽）
ipcMain.handle('read-image-data', async (event, filePath) => {
  try {
    // 如果filePath是絕對路徑，直接使用；否則相對於項目根目錄
    const fullPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(projectRoot, filePath);
    
    const data = await fs.readFile(fullPath);
    const base64 = data.toString('base64');
    
    // 判斷文件類型
    const ext = path.extname(fullPath).toLowerCase().slice(1);
    const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
    
    return {
      base64: base64,
      isVideo: isVideo,
      mimeType: isVideo ? `video/${ext === 'mov' ? 'quicktime' : ext}` : `image/${ext === 'jpg' ? 'jpeg' : ext}`
    };
  } catch (error) {
    console.error('讀取文件失敗:', error);
    return null;
  }
});
