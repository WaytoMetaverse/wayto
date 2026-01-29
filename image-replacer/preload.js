const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectImage: (allowVideo) => ipcRenderer.invoke('select-image', allowVideo),
  getImageConfig: () => ipcRenderer.invoke('get-image-config'),
  checkImageExists: (filePath) => ipcRenderer.invoke('check-image-exists', filePath),
  checkVideoExists: (videoPath) => ipcRenderer.invoke('check-video-exists', videoPath),
  copyImage: (sourcePath, targetPath) => ipcRenderer.invoke('copy-image', sourcePath, targetPath),
  copyImagesBatch: (imageMappings) => ipcRenderer.invoke('copy-images-batch', imageMappings),
  getHtmlPath: (htmlFile) => ipcRenderer.invoke('get-html-path', htmlFile),
  readImageData: (filePath) => ipcRenderer.invoke('read-image-data', filePath),
  getPanoramicEmbeds: () => ipcRenderer.invoke('get-panoramic-embeds'),
  setPanoramicEmbed: (id, url) => ipcRenderer.invoke('set-panoramic-embed', id, url),
  writePanoramicEmbeds: (embeds) => ipcRenderer.invoke('write-panoramic-embeds', embeds),
  getPortfolio: () => ipcRenderer.invoke('get-portfolio'),
  savePortfolio: (data) => ipcRenderer.invoke('save-portfolio', data),
  selectMultipleImages: () => ipcRenderer.invoke('select-multiple-images'),
  selectMultipleVideos: () => ipcRenderer.invoke('select-multiple-videos'),
  copyPortfolioImages: (sourcePaths, itemId) => ipcRenderer.invoke('copy-portfolio-images', sourcePaths, itemId),
  copyPortfolioVideos: (sourcePaths, itemId) => ipcRenderer.invoke('copy-portfolio-videos', sourcePaths, itemId)
});
