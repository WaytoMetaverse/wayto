// 全局狀態
let imageConfig = [];
let selectedImages = new Map(); // Map<imageId, {sourcePath, targetPath, targetPathVideo, preview, isVideo}>
let panoramicEmbeds = {}; // 720° 環景外部網址 { id: url }
let currentPreviewPage = 'portfolio.html';
let previewFrame = null;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  previewFrame = document.getElementById('preview-frame');
  
  // 載入圖片配置
  await loadImageConfig();
  
  // 初始化界面
  initializeUI();
  
  // 載入預覽
  loadPreview(currentPreviewPage);
});

// 載入圖片配置
async function loadImageConfig() {
  try {
    imageConfig = await window.electronAPI.getImageConfig();
    await checkExistingImages();
    try {
      panoramicEmbeds = await window.electronAPI.getPanoramicEmbeds() || {};
    } catch {
      panoramicEmbeds = {};
    }
    renderImageList();
  } catch (error) {
    console.error('載入配置失敗:', error);
  }
}

// 檢查現有圖片和視頻
async function checkExistingImages() {
  for (const image of imageConfig.images) {
    const imageExists = await window.electronAPI.checkImageExists(image.targetPath);
    const videoExists = image.targetPathVideo 
      ? await window.electronAPI.checkVideoExists(image.targetPathVideo)
      : false;
    
    image.exists = imageExists;
    image.videoExists = videoExists;
    
    if (imageExists) {
      // 如果圖片已存在，自動載入為預選
      const preview = await getImagePreview(image.targetPath);
      if (preview) {
        selectedImages.set(image.id, {
          sourcePath: null, // 使用現有圖片
          targetPath: image.targetPath,
          targetPathVideo: image.targetPathVideo || null,
          preview: preview,
          isVideo: false
        });
      }
    } else if (videoExists && image.targetPathVideo) {
      // 如果視頻已存在，自動載入為預選
      const preview = await getImagePreview(image.targetPathVideo);
      if (preview) {
        selectedImages.set(image.id, {
          sourcePath: null, // 使用現有視頻
          targetPath: image.targetPath,
          targetPathVideo: image.targetPathVideo,
          preview: preview,
          isVideo: true
        });
      }
    }
  }
}

// 獲取圖片或視頻預覽
async function getImagePreview(filePath) {
  try {
    const result = await window.electronAPI.readImageData(filePath);
    if (result && result.base64) {
      return {
        data: `data:${result.mimeType};base64,${result.base64}`,
        isVideo: result.isVideo
      };
    }
  } catch (error) {
    console.error('讀取文件失敗:', error);
  }
  return null;
}

// 初始化UI
function initializeUI() {
  // 頁面選擇器
  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const page = btn.dataset.page;
      currentPreviewPage = page;
      loadPreview(page);
    });
  });
  
  // 搜尋框
  document.getElementById('search-box').addEventListener('input', (e) => {
    filterImageList(e.target.value);
  });
  
  // 分類篩選
  const categoryFilter = document.getElementById('filter-category');
  const categories = [...new Set(imageConfig.images.map(img => img.category))];
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });
  
  categoryFilter.addEventListener('change', (e) => {
    filterImageList(document.getElementById('search-box').value, e.target.value);
  });
  
  // 確認按鈕
  document.getElementById('btn-confirm').addEventListener('click', showConfirmModal);
  document.getElementById('btn-proceed').addEventListener('click', executeReplace);
  document.getElementById('btn-cancel').addEventListener('click', () => {
    document.getElementById('confirm-modal').classList.remove('show');
  });
  document.getElementById('btn-close-result').addEventListener('click', () => {
    document.getElementById('result-modal').classList.remove('show');
  });

  // 設定環景網址彈窗
  document.getElementById('btn-embed-cancel').addEventListener('click', closeEmbedUrlModal);
  document.getElementById('btn-embed-ok').addEventListener('click', confirmEmbedUrl);
  document.getElementById('embed-url-modal').addEventListener('click', (e) => {
    if (e.target.id === 'embed-url-modal') closeEmbedUrlModal();
  });
  document.getElementById('embed-url-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmEmbedUrl();
    if (e.key === 'Escape') closeEmbedUrlModal();
  });
  
  // 預覽所有變更按鈕
  document.getElementById('btn-preview-all').addEventListener('click', () => {
    updatePreview();
  });

  // 左側面板切換：圖片列表 / 作品集
  document.querySelectorAll('.panel-tab[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      document.querySelectorAll('.panel-tab[data-panel]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-images').style.display = panel === 'images' ? 'block' : 'none';
      document.getElementById('panel-portfolio').style.display = panel === 'portfolio' ? 'block' : 'none';
      document.getElementById('filter-controls-images').style.display = panel === 'images' ? 'flex' : 'none';
      document.getElementById('filter-controls-portfolio').style.display = panel === 'portfolio' ? 'flex' : 'none';
      if (panel === 'portfolio') loadAndRenderPortfolioList();
    });
  });
  document.getElementById('btn-add-portfolio-inline').addEventListener('click', openPortfolioModal);

  // 新增/編輯作品集
  document.getElementById('btn-add-portfolio').addEventListener('click', openPortfolioModal);
  document.getElementById('btn-portfolio-cancel').addEventListener('click', closePortfolioModal);
  document.getElementById('btn-portfolio-save').addEventListener('click', savePortfolioItem);
  document.getElementById('portfolio-select-images').addEventListener('click', selectPortfolioImages);
  document.getElementById('portfolio-select-videos').addEventListener('click', selectPortfolioVideos);
  document.getElementById('portfolio-modal').addEventListener('click', (e) => {
    if (e.target.id === 'portfolio-modal') closePortfolioModal();
  });
}

// 渲染圖片列表
function renderImageList(filteredImages = null) {
  const imageList = document.getElementById('image-list');
  imageList.innerHTML = '';
  
  const imagesToShow = filteredImages || imageConfig.images;
  
  imagesToShow.forEach(image => {
    const item = createImageItem(image);
    imageList.appendChild(item);
  });
  
  updateConfirmButton();
}

// 創建圖片項目
function createImageItem(image) {
  const div = document.createElement('div');
  div.className = 'image-item';
  div.dataset.imageId = image.id;
  
  const selected = selectedImages.has(image.id);
  const selectedData = selected ? selectedImages.get(image.id) : null;
  const preview = selectedData ? selectedData.preview : null;
  const isVideo = selectedData ? selectedData.isVideo : false;
  const supportsVideo = image.supportsVideo || false;
  const supportsEmbedUrl = image.supportsEmbedUrl || false;
  const hasEmbedUrl = !!(panoramicEmbeds[image.id] || '').trim();
  const statusText = hasEmbedUrl ? '已設定環景' : (selected || image.exists || image.videoExists ? (isVideo ? '已選擇(影片)' : '已選擇') : '未選擇');
  
  div.innerHTML = `
    <div class="image-item-header">
      <div>
        <div class="image-item-name">${image.name}</div>
        <div class="image-item-category">${image.category}${supportsVideo ? ' (支援影片)' : ''}${supportsEmbedUrl ? ' · 可設環景網址' : ''}</div>
      </div>
      <span class="image-status ${selected || image.exists || image.videoExists || hasEmbedUrl ? 'has-image' : ''}">
        ${statusText}
      </span>
    </div>
    <div class="image-preview-container">
      <div class="image-preview">
        ${preview ? (
          isVideo 
            ? `<video src="${preview.data}" muted style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;"></video>`
            : `<img src="${preview.data}" alt="預覽">`
        ) : hasEmbedUrl ? '<span class="embed-placeholder">環景網址已設定</span>' : '無預覽'}
      </div>
      <div class="image-actions">
        <button class="btn-select-image" data-action="select" data-image-id="${image.id}" data-supports-video="${supportsVideo}">
          ${selected ? '更換' : '選擇圖片'}
        </button>
        ${supportsVideo ? `<button class="btn-select-video" data-action="select-video" data-image-id="${image.id}">${selected && isVideo ? '更換' : '選擇影片'}</button>` : ''}
        ${supportsEmbedUrl ? `<button class="btn-set-embed" data-action="set-embed" data-image-id="${image.id}">${hasEmbedUrl ? '更改環景網址' : '設定環景網址'}</button>` : ''}
        ${selected ? `<button class="btn-remove-image" data-action="remove" data-image-id="${image.id}">移除</button>` : ''}
      </div>
    </div>
  `;
  
  div.querySelector('[data-action="select"]').addEventListener('click', () => {
    selectImage(image.id, false);
  });
  
  if (supportsVideo) {
    div.querySelector('[data-action="select-video"]').addEventListener('click', () => {
      selectImage(image.id, true);
    });
  }
  
  if (supportsEmbedUrl) {
    div.querySelector('[data-action="set-embed"]').addEventListener('click', () => {
      setPanoramicEmbedUrl(image.id, image.name);
    });
  }
  
  if (selected) {
    div.querySelector('[data-action="remove"]').addEventListener('click', () => {
      removeImage(image.id);
    });
  }
  
  return div;
}

// 目前正在編輯環景網址的項目 id
let embedUrlEditingId = null;
// 環景網址已修改但尚未按「確認並替換」套用
let embedUrlsDirty = false;

// 新增作品集：已選圖片路徑（第一張為封面）、影片路徑；編輯時目前項目 id 與既有數量
let portfolioSelectedPaths = [];
let portfolioSelectedVideos = [];
let currentEditingItemId = null;
let editingItemExistingImages = 0;
let editingItemExistingVideos = 0;

// 開啟「設定環景網址」彈窗
function openEmbedUrlModal(imageId, imageName) {
  embedUrlEditingId = imageId;
  document.getElementById('embed-url-modal-title').textContent = '設定環景網址：' + (imageName || imageId);
  document.getElementById('embed-url-input').value = (panoramicEmbeds[imageId] || '').trim();
  document.getElementById('embed-url-modal').classList.add('show');
  setTimeout(() => document.getElementById('embed-url-input').focus(), 100);
}

// 關閉環景網址彈窗
function closeEmbedUrlModal() {
  embedUrlEditingId = null;
  document.getElementById('embed-url-modal').classList.remove('show');
}

// 確定環景網址（僅更新記憶體，實際寫入在「確認並替換」時執行）
function confirmEmbedUrl() {
  if (!embedUrlEditingId) return;
  const input = document.getElementById('embed-url-input');
  const url = (input.value || '').trim();
  panoramicEmbeds[embedUrlEditingId] = url;
  embedUrlsDirty = true;
  closeEmbedUrlModal();
  renderImageList();
  if (currentPreviewPage === 'services.html') loadPreview('services.html');
  updateConfirmButton();
}

// 設定 720° 環景外部平台網址（點擊按鈕時開啟彈窗）
function setPanoramicEmbedUrl(imageId, imageName) {
  openEmbedUrlModal(imageId, imageName);
}

// --- 作品集管理 ---
async function loadAndRenderPortfolioList() {
  const data = await window.electronAPI.getPortfolio();
  const listEl = document.getElementById('portfolio-list');
  const items = data.items || [];
  const categoryNames = { interior: '室內設計 3D', commercial: '商業空間', construction: '建案', material: '建材 / 虛擬展場' };
  if (items.length === 0) {
    listEl.innerHTML = '<p class="text-gray-500" style="padding: 12px;">尚無作品，點「新增作品集」新增。</p>';
    return;
  }
  listEl.innerHTML = items.map((item, index) => {
    const catName = categoryNames[item.category] || item.category;
    const canUp = index > 0;
    const canDown = index < items.length - 1;
    return '<div class="portfolio-item" data-item-id="' + item.id + '" data-index="' + index + '">' +
      '<div class="portfolio-item-name">' + (item.name || '未命名') + '</div>' +
      '<div class="portfolio-item-meta">' + catName + '</div>' +
      '<div class="portfolio-item-actions">' +
      (canUp ? '<button type="button" class="btn-move-portfolio" data-action="move-up" data-item-id="' + item.id + '" title="上移">↑</button>' : '') +
      (canDown ? '<button type="button" class="btn-move-portfolio" data-action="move-down" data-item-id="' + item.id + '" title="下移">↓</button>' : '') +
      '<button type="button" class="btn-edit-portfolio" data-action="edit" data-item-id="' + item.id + '">編輯</button>' +
      '<button type="button" class="btn-delete-portfolio" data-action="delete" data-item-id="' + item.id + '">刪除</button>' +
      '</div></div>';
  }).join('');
  listEl.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.itemId;
      const data = await window.electronAPI.getPortfolio();
      const item = (data.items || []).find(i => i.id === id);
      if (item) openPortfolioModalForEdit(item);
    });
  });
  listEl.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deletePortfolioItem(btn.dataset.itemId));
  });
  listEl.querySelectorAll('[data-action="move-up"]').forEach(btn => {
    btn.addEventListener('click', () => movePortfolioItem(btn.dataset.itemId, -1));
  });
  listEl.querySelectorAll('[data-action="move-down"]').forEach(btn => {
    btn.addEventListener('click', () => movePortfolioItem(btn.dataset.itemId, 1));
  });
}

async function movePortfolioItem(itemId, direction) {
  const data = await window.electronAPI.getPortfolio();
  const items = data.items || [];
  const index = items.findIndex(i => i.id === itemId);
  if (index === -1) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= items.length) return;
  [items[index], items[newIndex]] = [items[newIndex], items[index]];
  data.items = items;
  await window.electronAPI.savePortfolio(data);
  loadAndRenderPortfolioList();
  loadPreview('portfolio.html');
}

async function deletePortfolioItem(itemId) {
  if (!confirm('確定要刪除此作品？')) return;
  const data = await window.electronAPI.getPortfolio();
  data.items = (data.items || []).filter(i => i.id !== itemId);
  await window.electronAPI.savePortfolio(data);
  loadAndRenderPortfolioList();
  loadPreview('portfolio.html');
}

function openPortfolioModal() {
  currentEditingItemId = null;
  editingItemExistingImages = 0;
  editingItemExistingVideos = 0;
  portfolioSelectedPaths = [];
  portfolioSelectedVideos = [];
  document.getElementById('portfolio-modal-title').textContent = '新增作品集';
  document.getElementById('portfolio-category').value = 'interior';
  document.getElementById('portfolio-name').value = '';
  document.getElementById('portfolio-desc').value = '';
  document.getElementById('portfolio-images-list').innerHTML = '';
  document.getElementById('portfolio-videos-list').innerHTML = '';
  document.getElementById('portfolio-embed-url').value = '';
  document.getElementById('portfolio-modal').classList.add('show');
}

function openPortfolioModalForEdit(item) {
  currentEditingItemId = item.id;
  editingItemExistingImages = (item.images || []).length;
  editingItemExistingVideos = (item.videos || []).length;
  portfolioSelectedPaths = [];
  portfolioSelectedVideos = [];
  document.getElementById('portfolio-modal-title').textContent = '編輯作品集';
  document.getElementById('portfolio-category').value = item.category || 'interior';
  document.getElementById('portfolio-name').value = item.name || '';
  document.getElementById('portfolio-desc').value = item.description || '';
  document.getElementById('portfolio-embed-url').value = item.embedUrl || '';
  renderPortfolioImagesList();
  renderPortfolioVideosList();
  document.getElementById('portfolio-modal').classList.add('show');
}

function closePortfolioModal() {
  document.getElementById('portfolio-modal').classList.remove('show');
}

function renderPortfolioImagesList() {
  const el = document.getElementById('portfolio-images-list');
  if (portfolioSelectedPaths.length > 0) {
    el.innerHTML = portfolioSelectedPaths.map((p, i) => {
      const name = p.split(/[/\\]/).pop();
      return '<div class="img-item">' + (i + 1) + '. ' + name + (i === 0 ? ' <em>（封面）</em>' : '') + '</div>';
    }).join('');
    return;
  }
  if (currentEditingItemId && editingItemExistingImages > 0) {
    el.innerHTML = '<span class="text-gray-600">目前 ' + editingItemExistingImages + ' 張圖片（點「選擇圖片」可替換）</span>';
    return;
  }
  el.innerHTML = '<span class="text-gray-400">尚未選擇圖片</span>';
}

function renderPortfolioVideosList() {
  const el = document.getElementById('portfolio-videos-list');
  if (portfolioSelectedVideos.length > 0) {
    el.innerHTML = portfolioSelectedVideos.map((p, i) => {
      const name = p.split(/[/\\]/).pop();
      return '<div class="img-item">' + (i + 1) + '. ' + name + '</div>';
    }).join('');
    return;
  }
  if (currentEditingItemId && editingItemExistingVideos > 0) {
    el.innerHTML = '<span class="text-gray-600">目前 ' + editingItemExistingVideos + ' 支影片（點「選擇影片」可替換）</span>';
    return;
  }
  el.innerHTML = '<span class="text-gray-400">尚未選擇影片</span>';
}

async function selectPortfolioImages() {
  const paths = await window.electronAPI.selectMultipleImages();
  if (paths.length > 0) {
    portfolioSelectedPaths = paths;
    renderPortfolioImagesList();
  }
}

async function selectPortfolioVideos() {
  const paths = await window.electronAPI.selectMultipleVideos();
  if (paths.length > 0) {
    portfolioSelectedVideos = paths;
    renderPortfolioVideosList();
  }
}

async function savePortfolioItem() {
  const category = document.getElementById('portfolio-category').value.trim();
  const name = document.getElementById('portfolio-name').value.trim();
  const description = document.getElementById('portfolio-desc').value.trim();
  const embedUrl = (document.getElementById('portfolio-embed-url').value || '').trim();
  if (!name) {
    alert('請填寫作品名稱');
    return;
  }
  const hasNewImages = portfolioSelectedPaths.length > 0;
  const hasNewVideos = portfolioSelectedVideos.length > 0;
  const hasEmbed = !!embedUrl;
  const isEdit = !!currentEditingItemId;
  const hasExistingMedia = isEdit && (editingItemExistingImages > 0 || editingItemExistingVideos > 0);
  if (!hasNewImages && !hasNewVideos && !hasEmbed && !hasExistingMedia) {
    alert('請至少選擇圖片、影片，或填寫環景網址');
    return;
  }
  const data = await window.electronAPI.getPortfolio();
  if (!data.categories || data.categories.length === 0) {
    data.categories = [
      { id: 'interior', name: '室內設計 3D' },
      { id: 'commercial', name: '商業空間' },
      { id: 'construction', name: '建案' },
      { id: 'material', name: '建材 / 虛擬展場' }
    ];
  }
  if (!data.items) data.items = [];
  let item;
  if (isEdit) {
    item = data.items.find(i => i.id === currentEditingItemId);
    if (!item) {
      alert('找不到該作品');
      return;
    }
    item.category = category;
    item.name = name;
    item.description = description;
    item.embedUrl = hasEmbed ? embedUrl : '';
    if (hasNewImages) {
      item.images = await window.electronAPI.copyPortfolioImages(portfolioSelectedPaths, item.id);
    }
    if (hasNewVideos) {
      item.videos = await window.electronAPI.copyPortfolioVideos(portfolioSelectedVideos, item.id);
    }
    if (!item.images) item.images = [];
    if (!item.videos) item.videos = [];
  } else {
    const itemId = 'item-' + Date.now();
    const imagePaths = hasNewImages ? await window.electronAPI.copyPortfolioImages(portfolioSelectedPaths, itemId) : [];
    const videoPaths = hasNewVideos ? await window.electronAPI.copyPortfolioVideos(portfolioSelectedVideos, itemId) : [];
    item = {
      id: itemId,
      category: category,
      name: name,
      description: description,
      images: imagePaths,
      videos: videoPaths
    };
    if (hasEmbed) item.embedUrl = embedUrl;
    data.items.push(item);
  }
  await window.electronAPI.savePortfolio(data);
  closePortfolioModal();
  currentEditingItemId = null;
  if (document.getElementById('panel-portfolio').style.display !== 'none') {
    loadAndRenderPortfolioList();
  }
  loadPreview('portfolio.html');
}

// 選擇圖片或視頻
async function selectImage(imageId, isVideo = false) {
  const image = imageConfig.images.find(img => img.id === imageId);
  if (!image) return;
  
  const sourcePath = await window.electronAPI.selectImage(isVideo || image.supportsVideo);
  if (!sourcePath) return;
  
  // 判斷選擇的是圖片還是視頻
  const ext = sourcePath.split('.').pop().toLowerCase();
  const videoExts = ['mp4', 'webm', 'ogg', 'mov'];
  const selectedIsVideo = videoExts.includes(ext);
  
  // 讀取文件作為預覽
  try {
    const previewResult = await getImagePreview(sourcePath);
    if (previewResult) {
      const targetPath = selectedIsVideo 
        ? (image.targetPathVideo || image.targetPath.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '.mp4'))
        : image.targetPath;
      
      selectedImages.set(imageId, {
        sourcePath: sourcePath,
        targetPath: image.targetPath,
        targetPathVideo: image.targetPathVideo || targetPath,
        preview: previewResult,
        isVideo: selectedIsVideo
      });
      
      renderImageList();
      updatePreview();
      updateConfirmButton();
    }
  } catch (error) {
    console.error('讀取文件失敗:', error);
    alert('讀取文件失敗，請重試');
  }
}

// 移除圖片
function removeImage(imageId) {
  selectedImages.delete(imageId);
  renderImageList();
  updatePreview();
  updateConfirmButton();
}

// 篩選圖片列表
function filterImageList(searchText = '', category = 'all') {
  let filtered = imageConfig.images;
  
  if (category !== 'all') {
    filtered = filtered.filter(img => img.category === category);
  }
  
  if (searchText) {
    const search = searchText.toLowerCase();
    filtered = filtered.filter(img => 
      img.name.toLowerCase().includes(search) ||
      img.category.toLowerCase().includes(search)
    );
  }
  
  renderImageList(filtered);
}

// 載入預覽
async function loadPreview(htmlFile) {
  currentPreviewPage = htmlFile;
  const htmlPath = await window.electronAPI.getHtmlPath(htmlFile);
  
  // 清除舊的src以強制重新載入（避免緩存問題）
  previewFrame.src = '';
  
  // 使用file://協議載入本地HTML文件，添加時間戳避免緩存
  const timestamp = new Date().getTime();
  previewFrame.src = `file:///${htmlPath.replace(/\\/g, '/')}?t=${timestamp}`;
  
  // 等待iframe載入後更新圖片
  previewFrame.onload = () => {
    // 延遲一下確保內容完全載入
    setTimeout(() => {
      updatePreview();
    }, 500);
  };
}

// 更新預覽（替換iframe中的圖片或視頻）
function updatePreview() {
  if (!previewFrame.contentWindow) return;
  
  try {
    const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    if (!doc) {
      // 如果無法訪問，嘗試通過postMessage
      previewFrame.contentWindow.postMessage({
        type: 'update-media',
        media: Array.from(selectedImages.entries())
          .filter(([id, data]) => {
            const image = imageConfig.images.find(img => img.id === id);
            return image && image.htmlFile === currentPreviewPage && data.preview;
          })
          .map(([id, data]) => {
            const image = imageConfig.images.find(img => img.id === id);
            return {
              targetPath: image.targetPath,
              targetPathVideo: image.targetPathVideo || null,
              preview: data.preview.data,
              isVideo: data.isVideo
            };
          })
      }, '*');
      return;
    }
    
    // 直接更新圖片或視頻
    selectedImages.forEach((data, imageId) => {
      const image = imageConfig.images.find(img => img.id === imageId);
      if (!image || image.htmlFile !== currentPreviewPage) return;
      
      if (data.preview) {
        const targetFileName = image.targetPath.split('/').pop();
        const selectors = [
          `img[src*="${image.targetPath}"]`,
          `img[src*="${targetFileName}"]`,
          `img[alt*="${image.name}"]`,
          `video[src*="${image.targetPathVideo || image.targetPath}"]`
        ];
        
        let element = null;
        for (const selector of selectors) {
          element = doc.querySelector(selector);
          if (element) break;
        }
        
        if (element) {
          if (data.isVideo) {
            // 如果是視頻，需要替換為video元素
            if (element.tagName === 'IMG') {
              const video = document.createElement('video');
              video.src = data.preview.data;
              video.className = element.className;
              video.style.cssText = element.style.cssText;
              video.setAttribute('autoplay', '');
              video.setAttribute('loop', '');
              video.setAttribute('muted', '');
              video.setAttribute('playsinline', '');
              element.parentNode.replaceChild(video, element);
            } else if (element.tagName === 'VIDEO') {
              element.src = data.preview.data;
            }
          } else {
            // 如果是圖片，替換src
            if (element.tagName === 'VIDEO') {
              const img = document.createElement('img');
              img.src = data.preview.data;
              img.className = element.className;
              img.style.cssText = element.style.cssText;
              img.alt = image.name;
              element.parentNode.replaceChild(img, element);
            } else if (element.tagName === 'IMG') {
              element.src = data.preview.data;
            }
          }
        }
      }
    });
  } catch (error) {
    // 跨域限制可能導致無法訪問iframe內容
    console.log('預覽更新（可能需要手動刷新預覽）:', error.message);
  }
}

// 更新確認按鈕狀態（有未套用的圖片/影片替換，或有未套用的環景網址時可按）
function updateConfirmButton() {
  const btnConfirm = document.getElementById('btn-confirm');
  const hasNewFiles = Array.from(selectedImages.values()).some(
    data => data.sourcePath !== null
  );
  const hasEmbedChanges = embedUrlsDirty;
  btnConfirm.disabled = !hasNewFiles && !hasEmbedChanges;
}

// 顯示確認對話框
function showConfirmModal() {
  const newFiles = Array.from(selectedImages.values()).filter(
    data => data.sourcePath !== null
  );
  const hasEmbedChanges = embedUrlsDirty;
  
  if (newFiles.length === 0 && !hasEmbedChanges) {
    alert('請先選擇要替換的圖片/影片，或設定環景網址');
    return;
  }
  
  let text = '';
  if (newFiles.length > 0) text += `替換 ${newFiles.length} 個檔案`;
  if (hasEmbedChanges) text += (text ? ' 並 ' : '') + '套用環景網址';
  document.getElementById('replace-count').textContent = text || '—';
  document.getElementById('confirm-modal').classList.add('show');
}

// 執行替換
async function executeReplace() {
  document.getElementById('confirm-modal').classList.remove('show');
  document.getElementById('progress-modal').classList.add('show');
  
  const newFiles = Array.from(selectedImages.entries())
    .filter(([id, data]) => data.sourcePath !== null)
    .map(([id, data]) => ({
      sourcePath: data.sourcePath,
      targetPath: data.isVideo ? data.targetPathVideo : data.targetPath
    }));
  
  const total = newFiles.length;
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  
  try {
    progressFill.style.width = '0%';
    if (total > 0 && embedUrlsDirty) {
      progressText.textContent = '準備替換檔案與套用環景網址...';
    } else if (embedUrlsDirty) {
      progressText.textContent = '正在套用環景網址...';
    } else {
      progressText.textContent = `準備替換 ${total} 個文件...`;
    }
    
    const results = total > 0 ? await window.electronAPI.copyImagesBatch(newFiles) : [];
    const didWriteEmbeds = embedUrlsDirty;
    if (embedUrlsDirty) {
      await window.electronAPI.writePanoramicEmbeds(panoramicEmbeds);
      embedUrlsDirty = false;
    }
    
    progressFill.style.width = '100%';
    progressText.textContent = '完成！';
    
    setTimeout(() => {
      showResultModal(results, null, didWriteEmbeds && total === 0);
    }, 500);
  } catch (error) {
    console.error('替換失敗:', error);
    showResultModal([], error.message, false);
  } finally {
    setTimeout(() => {
      document.getElementById('progress-modal').classList.remove('show');
    }, 1000);
  }
}

// 顯示結果對話框（onlyEmbeds = 僅套用環景網址、無檔案替換）
function showResultModal(results, error = null, onlyEmbeds = false) {
  const resultModal = document.getElementById('result-modal');
  const resultTitle = document.getElementById('result-title');
  const resultContent = document.getElementById('result-content');
  
  if (error) {
    resultTitle.textContent = '替換失敗';
    resultContent.innerHTML = `<div class="result-item error">錯誤: ${error}</div>`;
  } else if (onlyEmbeds) {
    resultTitle.textContent = '套用完成';
    resultContent.innerHTML = '<div class="result-item success">✓ 環景網址已套用</div>';
  } else {
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    resultTitle.textContent = `替換完成 (成功: ${successCount}, 失敗: ${failCount})`;
    
    resultContent.innerHTML = results.map(result => {
      if (result.success) {
        return `<div class="result-item success">✓ ${result.targetPath}</div>`;
      } else {
        return `<div class="result-item error">✗ ${result.targetPath}: ${result.error}</div>`;
      }
    }).join('');
  }
  
  resultModal.classList.add('show');
  
  // 重新載入配置以更新狀態
  loadImageConfig();
}
