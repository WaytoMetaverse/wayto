// 全局狀態
let imageConfig = [];
let selectedImages = new Map(); // Map<imageId, {sourcePath, targetPath, targetPathVideo, preview, isVideo}>
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
  
  // 預覽所有變更按鈕
  document.getElementById('btn-preview-all').addEventListener('click', () => {
    updatePreview();
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
  
  div.innerHTML = `
    <div class="image-item-header">
      <div>
        <div class="image-item-name">${image.name}</div>
        <div class="image-item-category">${image.category}${supportsVideo ? ' (支援影片)' : ''}</div>
      </div>
      <span class="image-status ${selected || image.exists || image.videoExists ? 'has-image' : ''}">
        ${selected || image.exists || image.videoExists ? (isVideo ? '已選擇(影片)' : '已選擇') : '未選擇'}
      </span>
    </div>
    <div class="image-preview-container">
      <div class="image-preview">
        ${preview ? (
          isVideo 
            ? `<video src="${preview.data}" muted style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;"></video>`
            : `<img src="${preview.data}" alt="預覽">`
        ) : '無預覽'}
      </div>
      <div class="image-actions">
        <button class="btn-select-image" data-action="select" data-image-id="${image.id}" data-supports-video="${supportsVideo}">
          ${selected ? '更換' : '選擇圖片'}
        </button>
        ${supportsVideo ? `<button class="btn-select-video" data-action="select-video" data-image-id="${image.id}">${selected && isVideo ? '更換' : '選擇影片'}</button>` : ''}
        ${selected ? `<button class="btn-remove-image" data-action="remove" data-image-id="${image.id}">移除</button>` : ''}
      </div>
    </div>
  `;
  
  // 添加事件監聽器
  div.querySelector('[data-action="select"]').addEventListener('click', () => {
    selectImage(image.id, false);
  });
  
  if (supportsVideo) {
    div.querySelector('[data-action="select-video"]').addEventListener('click', () => {
      selectImage(image.id, true);
    });
  }
  
  if (selected) {
    div.querySelector('[data-action="remove"]').addEventListener('click', () => {
      removeImage(image.id);
    });
  }
  
  return div;
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

// 更新確認按鈕狀態
function updateConfirmButton() {
  const btnConfirm = document.getElementById('btn-confirm');
  const hasNewFiles = Array.from(selectedImages.values()).some(
    data => data.sourcePath !== null
  );
  btnConfirm.disabled = !hasNewFiles;
}

// 顯示確認對話框
function showConfirmModal() {
  const newFiles = Array.from(selectedImages.values()).filter(
    data => data.sourcePath !== null
  );
  
  if (newFiles.length === 0) {
    alert('請先選擇要替換的圖片或影片');
    return;
  }
  
  document.getElementById('replace-count').textContent = newFiles.length;
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
    // 更新進度
    progressFill.style.width = '0%';
    progressText.textContent = `準備替換 ${total} 個文件...`;
    
    const results = await window.electronAPI.copyImagesBatch(newFiles);
    
    // 更新進度條
    progressFill.style.width = '100%';
    progressText.textContent = '完成！';
    
    // 顯示結果
    setTimeout(() => {
      showResultModal(results);
    }, 500);
  } catch (error) {
    console.error('替換失敗:', error);
    showResultModal([], error.message);
  } finally {
    setTimeout(() => {
      document.getElementById('progress-modal').classList.remove('show');
    }, 1000);
  }
}

// 顯示結果對話框
function showResultModal(results, error = null) {
  const resultModal = document.getElementById('result-modal');
  const resultTitle = document.getElementById('result-title');
  const resultContent = document.getElementById('result-content');
  
  if (error) {
    resultTitle.textContent = '替換失敗';
    resultContent.innerHTML = `<div class="result-item error">錯誤: ${error}</div>`;
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
