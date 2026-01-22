const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectImage: (allowVideo) => ipcRenderer.invoke('select-image', allowVideo),
  getImageConfig: () => ipcRenderer.invoke('get-image-config'),
  checkImageExists: (filePath) => ipcRenderer.invoke('check-image-exists', filePath),
  checkVideoExists: (videoPath) => ipcRenderer.invoke('check-video-exists', videoPath),
  copyImage: (sourcePath, targetPath) => ipcRenderer.invoke('copy-image', sourcePath, targetPath),
  copyImagesBatch: (imageMappings) => ipcRenderer.invoke('copy-images-batch', imageMappings),
  getHtmlPath: (htmlFile) => ipcRenderer.invoke('get-html-path', htmlFile),
  readImageData: (filePath) => ipcRenderer.invoke('read-image-data', filePath)
});
