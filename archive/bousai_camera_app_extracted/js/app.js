/**
 * 石巻圏 リアルタイム定点観測ビューア - メインアプリケーションロジック
 */

(function() {
  'use strict';

  // ■ 設定定数
  const CONFIG = {
    MAP_CENTER: [38.445, 141.300],
    MAP_ZOOM: 11,
    REFRESH_INTERVAL: 10 * 60 * 1000, // 10分
    CATEGORY_COLORS: {
      river: '#3b82f6',
      road: '#f59e0b',
      coast: '#06b6d4',
      city: '#10b981',
      other: '#a78bfa'
    },
    CATEGORY_LABELS: {
      river: '河川',
      road: '道路',
      coast: '海岸',
      city: '市街地',
      other: 'その他'
    },
    CATEGORY_ICONS: {
      river: 'fa-water',
      road: 'fa-road',
      coast: 'fa-anchor',
      city: 'fa-building',
      other: 'fa-video'
    },
    FAV_STORAGE_KEY: 'ishinomaki_fav_cameras'
  };

  // ■ 水系・地域グループの定義判定関数
  function getGroupForCamera(camera) {
    const name = camera.name || '';
    const desc = camera.description || '';
    const category = camera.category || 'other';

    if (category === 'road') {
      return { id: 'group_road', title: '道路・陸上交通', icon: 'fa-road', order: 6 };
    }

    if (name.includes('北上川') || name.includes('飯野川') || name.includes('福地') || name.includes('釜谷') || name.includes('新北上')) {
      return { id: 'group_kitakami', title: '北上川水系', icon: 'fa-water', order: 2 };
    }
    if (name.includes('旧北上川') || name.includes('内海橋') || name.includes('日妻橋') || name.includes('脇谷') || name.includes('石巻大橋')) {
      return { id: 'group_kyu_kitakami', title: '旧北上川水系', icon: 'fa-water', order: 3 };
    }
    if (name.includes('鳴瀬川') || name.includes('吉田川') || name.includes('東名運河') || name.includes('入釜谷') || name.includes('野蒜') || name.includes('竹谷')) {
      return { id: 'group_naruse', title: '鳴瀬川・吉田川・運河水系', icon: 'fa-water', order: 4 };
    }

    return { id: 'group_other_river', title: 'その他河川・水上構造物', icon: 'fa-water', order: 5 };
  }

  // ■ 状態管理
  let state = {
    map: null,
    layers: {},
    markers: {},
    activeCategoryFilters: new Set(['river', 'road', 'coast', 'city', 'other']),
    activeOperatorFilter: 'all',
    favorites: new Set(),
    searchQuery: '',
    accordionStates: {},
    isMapCollapsed: false,
    refreshTimer: null,
    countdownTimer: null,
    nextRefreshTime: null
  };

  // DOMContentLoaded で初期化
  document.addEventListener('DOMContentLoaded', initApp);

  // ■ 初期化メイン関数
  function initApp() {
    loadFavorites();
    initMap();
    initMarkers();
    initSidebarAccordion();
    initMapToggle();
    initFilters();
    initSearch();
    initModal();
    startAutoRefresh();
    updateStatusBar();
  }

  // ■ お気に入りの読み込み・保存
  function loadFavorites() {
    try {
      const saved = localStorage.getItem(CONFIG.FAV_STORAGE_KEY);
      if (saved) {
        state.favorites = new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('お気に入りデータの読み込みに失敗しました:', e);
      state.favorites = new Set();
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(CONFIG.FAV_STORAGE_KEY, JSON.stringify(Array.from(state.favorites)));
    } catch (e) {
      console.warn('お気に入りデータの保存に失敗しました:', e);
    }
  }

  function toggleFavorite(cameraId, event) {
    if (event) event.stopPropagation();
    if (state.favorites.has(cameraId)) {
      state.favorites.delete(cameraId);
    } else {
      state.favorites.add(cameraId);
    }
    saveFavorites();
    updateFavoriteUI(cameraId);
    renderSidebarList();
  }

  function updateFavoriteUI(cameraId) {
    const isFav = state.favorites.has(cameraId);
    document.querySelectorAll(`.fav-btn[data-camera-id="${cameraId}"]`).forEach(btn => {
      if (isFav) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fa-solid fa-star"></i>';
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fa-regular fa-star"></i>';
      }
    });
  }

  // ■ 地図の初期化
  function initMap() {
    state.map = L.map('map', { zoomControl: false }).setView(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(state.map);

    L.control.zoom({ position: 'topright' }).addTo(state.map);
  }

  // ■ 地図折りたたみトグルの初期化
  function initMapToggle() {
    const mapToggleBtn = document.getElementById('map-toggle-btn');
    const mapToggleText = document.getElementById('map-toggle-text');
    const mapToggleIcon = document.getElementById('map-toggle-icon');
    const mapWrapper = document.getElementById('map-wrapper');
    const mainContent = document.getElementById('main-content');

    if (!mapToggleBtn || !mapWrapper || !mainContent) return;

    mapToggleBtn.addEventListener('click', () => {
      state.isMapCollapsed = !state.isMapCollapsed;

      if (state.isMapCollapsed) {
        mapWrapper.classList.add('collapsed');
        mainContent.classList.add('map-is-collapsed');
        if (mapToggleText) mapToggleText.textContent = '地図を表示';
        if (mapToggleIcon) {
          mapToggleIcon.classList.remove('fa-map-location-dot');
          mapToggleIcon.classList.add('fa-map');
        }
      } else {
        mapWrapper.classList.remove('collapsed');
        mainContent.classList.remove('map-is-collapsed');
        if (mapToggleText) mapToggleText.textContent = '地図を隠す';
        if (mapToggleIcon) {
          mapToggleIcon.classList.remove('fa-map');
          mapToggleIcon.classList.add('fa-map-location-dot');
        }
        // トランジション完了後に地図のサイズを再計算
        setTimeout(() => {
          if (state.map) state.map.invalidateSize();
        }, 350);
      }
    });
  }

  // ■ マーカーアイコンの作成
  function createMarkerIcon(category, status, heading, headingName) {
    let color = CONFIG.CATEGORY_COLORS[category] || CONFIG.CATEGORY_COLORS.other;
    let iconClass = CONFIG.CATEGORY_ICONS[category] || CONFIG.CATEGORY_ICONS.other;
    
    if (status === 'maintenance') {
      color = '#9ca3af';
      iconClass = 'fa-wrench';
    }
    
    return L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-wrapper">
               <div class="marker-icon marker-${category}" style="background-color: ${color};">
                 <i class="fa-solid ${iconClass}" style="color: white; font-size: 12px;"></i>
               </div>
             </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -36]
    });
  }

  // ■ マーカーの初期化
  function initMarkers() {
    Object.keys(CONFIG.CATEGORY_LABELS).forEach(category => {
      state.layers[category] = L.layerGroup().addTo(state.map);
    });

    if (typeof CAMERA_DATA === 'undefined') {
      console.error('CAMERA_DATA が定義されていません。');
      return;
    }

    CAMERA_DATA.forEach(camera => {
      const category = camera.category || 'other';
      const marker = L.marker([camera.lat, camera.lng], {
        icon: createMarkerIcon(category, camera.status, camera.heading, camera.headingName),
        title: camera.name
      });
      
      const categoryLabel = CONFIG.CATEGORY_LABELS[category] || 'その他';
      const popupContent = `
        <div class="popup-content">
          <div class="popup-name">${camera.name}</div>
          <div class="popup-category">${categoryLabel} | ${camera.operator || ''}</div>
          <button class="popup-btn" onclick="document.dispatchEvent(new CustomEvent('open-camera-modal', {detail: '${camera.id}'}))">
            <i class="fa-solid fa-expand"></i> 映像・詳細を見る
          </button>
        </div>
      `;
      marker.bindPopup(popupContent);

      if (state.layers[category]) {
        state.layers[category].addLayer(marker);
      }
      
      state.markers[camera.id] = marker;
    });

    document.addEventListener('open-camera-modal', (e) => {
      openModal(e.detail);
    });
  }

  // ■ サイドバーカードHTML生成
  function renderCameraCard(camera) {
    const category = camera.category || 'other';
    const categoryLabel = CONFIG.CATEGORY_LABELS[category] || 'その他';
    const categoryIcon = CONFIG.CATEGORY_ICONS[category] || 'fa-video';
    const isFav = state.favorites.has(camera.id);
    
    let previewHtml = '';
    if (camera.status === 'maintenance') {
      previewHtml = `<div class="card-placeholder" style="color: #9ca3af;">
        <i class="fa-solid fa-wrench"></i>
        <span>現在調整中・休止中</span>
      </div>`;
    } else if (camera.imageUrl) {
      previewHtml = `<img src="${camera.imageUrl}" class="live-image" data-base-src="${camera.imageUrl}" alt="${camera.name}" onerror="this.onerror=null; this.outerHTML='<div class=\\'card-placeholder\\' style=\\'color: #ef4444;\\'><i class=\\'fa-solid fa-triangle-exclamation\\'></i><span>画像取得エラー</span></div>';">`;
    } else if (camera.streamType === 'youtube' && camera.youtubeId) {
      previewHtml = `<div class="card-placeholder">
        <i class="fa-brands fa-youtube" style="color: #ef4444;"></i>
        <span>動画配信中</span>
      </div>`;
    } else {
      previewHtml = `<div class="card-placeholder">
        <i class="fa-solid ${categoryIcon}"></i>
        <span>配信元で確認</span>
      </div>`;
    }

    return `
      <div class="camera-card ${camera.status === 'maintenance' ? 'maintenance' : ''}" data-camera-id="${camera.id}" data-category="${category}" data-operator="${camera.operator || ''}">
        <div class="card-header">
          <span class="card-name">${camera.name}</span>
          <button class="fav-btn ${isFav ? 'active' : ''}" data-camera-id="${camera.id}" title="お気に入り登録">
            <i class="fa-${isFav ? 'solid' : 'regular'} fa-star"></i>
          </button>
          <span class="category-badge badge-${category}">${categoryLabel}</span>
        </div>
        <div class="card-preview">
          ${previewHtml}
        </div>
        <div class="card-info">
          <span class="card-operator"><i class="fa-solid fa-user-shield"></i> ${camera.operator || '管理者不明'}</span>
          ${camera.description ? `<span class="card-desc">${camera.description}</span>` : ''}
        </div>
        <div class="card-actions">
          <a href="${camera.sourceUrl}" target="_blank" rel="noopener noreferrer" class="btn-source" onclick="event.stopPropagation();">
            配信元を開く <i class="fa-solid fa-external-link"></i>
          </a>
        </div>
      </div>
    `;
  }

  // ■ サイドバーアコーディオンの生成と更新
  function initSidebarAccordion() {
    renderSidebarList();

    const toggleBtn = document.getElementById('sidebar-toggle');
    const toggleIcon = document.getElementById('toggle-icon');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && toggleIcon && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
          toggleIcon.classList.remove('fa-chevron-right');
          toggleIcon.classList.add('fa-chevron-left');
        } else {
          toggleIcon.classList.remove('fa-chevron-left');
          toggleIcon.classList.add('fa-chevron-right');
        }
        setTimeout(() => {
          if (state.map) state.map.invalidateSize();
        }, 300);
      });
    }
  }

  // ■ サイドバーリストの描画（アコーディオン構造）
  function renderSidebarList() {
    const listContainer = document.getElementById('camera-list');
    if (!listContainer || typeof CAMERA_DATA === 'undefined') return;

    const groups = {};
    
    if (state.favorites.size > 0) {
      groups['group_fav'] = {
        id: 'group_fav',
        title: '★ お気に入りカメラ',
        icon: 'fa-star',
        order: 1,
        cameras: []
      };
    }

    CAMERA_DATA.forEach(camera => {
      const category = camera.category || 'other';
      const operator = camera.operator || '';
      const matchesCategory = state.activeCategoryFilters.has(category);
      let matchesOperator = true;
      if (state.activeOperatorFilter === 'mlit') {
        matchesOperator = operator.includes('国土交通省');
      } else if (state.activeOperatorFilter === 'miyagi') {
        matchesOperator = operator.includes('宮城県');
      }

      const q = state.searchQuery.toLowerCase();
      const matchesSearch = q === '' ||
        camera.name.toLowerCase().includes(q) ||
        (camera.description && camera.description.toLowerCase().includes(q)) ||
        operator.toLowerCase().includes(q);

      if (!matchesCategory || !matchesOperator || !matchesSearch) {
        return;
      }

      if (state.favorites.has(camera.id) && groups['group_fav']) {
        groups['group_fav'].cameras.push(camera);
      }

      const gMeta = getGroupForCamera(camera);
      if (!groups[gMeta.id]) {
        groups[gMeta.id] = { ...gMeta, cameras: [] };
      }
      groups[gMeta.id].cameras.push(camera);
    });

    const sortedGroupKeys = Object.keys(groups).sort((a, b) => groups[a].order - groups[b].order);

    let html = '';
    let totalVisible = 0;

    sortedGroupKeys.forEach(gKey => {
      const group = groups[gKey];
      if (group.cameras.length === 0) return;

      if (group.id !== 'group_fav') {
        totalVisible += group.cameras.length;
      }

      const isOpen = state.accordionStates[group.id] !== false;

      html += `
        <div class="accordion-group ${isOpen ? 'open' : ''}" data-group-id="${group.id}">
          <div class="accordion-header" onclick="document.dispatchEvent(new CustomEvent('toggle-accordion', {detail: '${group.id}'}))">
            <div class="accordion-title">
              <i class="fa-solid ${group.icon}"></i>
              <span>${group.title}</span>
              <span class="group-count-badge">${group.cameras.length}台</span>
            </div>
            <i class="fa-solid fa-chevron-down accordion-arrow"></i>
          </div>
          <div class="accordion-body">
            ${group.cameras.map(c => renderCameraCard(c)).join('')}
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = html;

    // イベントバインド
    listContainer.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-camera-id');
        toggleFavorite(id, e);
      });
    });

    listContainer.querySelectorAll('.camera-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-camera-id');
        openModal(id);
      });

      card.addEventListener('mouseenter', () => {
        const id = card.getAttribute('data-camera-id');
        const marker = state.markers[id];
        if (marker) marker.setZIndexOffset(1000);
      });

      card.addEventListener('mouseleave', () => {
        const id = card.getAttribute('data-camera-id');
        const marker = state.markers[id];
        if (marker) marker.setZIndexOffset(0);
      });
    });

    const noResults = document.getElementById('no-results');
    if (noResults) {
      noResults.style.display = totalVisible === 0 && (groups['group_fav'] ? groups['group_fav'].cameras.length === 0 : true) ? 'block' : 'none';
    }

    updateSidebarCount(totalVisible);
    updateStatusBarDisplay(totalVisible);
  }

  document.addEventListener('toggle-accordion', (e) => {
    const gId = e.detail;
    state.accordionStates[gId] = state.accordionStates[gId] === false ? true : false;
    const groupEl = document.querySelector(`.accordion-group[data-group-id="${gId}"]`);
    if (groupEl) {
      groupEl.classList.toggle('open');
    }
  });

  function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn[data-category]');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = e.currentTarget.getAttribute('data-category');
        
        if (state.activeCategoryFilters.has(category)) {
          state.activeCategoryFilters.delete(category);
          e.currentTarget.classList.remove('active');
          if (state.layers[category]) {
            state.map.removeLayer(state.layers[category]);
          }
        } else {
          state.activeCategoryFilters.add(category);
          e.currentTarget.classList.add('active');
          if (state.layers[category]) {
            state.map.addLayer(state.layers[category]);
          }
        }
        
        renderSidebarList();
      });
    });

    const opBtns = document.querySelectorAll('.operator-btn');
    opBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        opBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        state.activeOperatorFilter = e.currentTarget.getAttribute('data-operator');
        renderSidebarList();
      });
    });
  }

  function initSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderSidebarList();
      });
    }
  }

  function updateSidebarCount(visibleCount) {
    const sidebarCount = document.getElementById('sidebar-count');
    if (sidebarCount) {
      const total = typeof CAMERA_DATA !== 'undefined' ? CAMERA_DATA.length : 0;
      sidebarCount.textContent = `${visibleCount} / ${total} 台`;
    }
  }

  function updateStatusBarDisplay(visibleCount) {
    const countDisplay = document.querySelector('.camera-count');
    if (countDisplay) {
      const total = typeof CAMERA_DATA !== 'undefined' ? CAMERA_DATA.length : 0;
      countDisplay.textContent = `表示 ${visibleCount} / 全 ${total} 台`;
    }
  }

  function initModal() {
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function openModal(cameraId) {
    const camera = CAMERA_DATA.find(c => c.id === cameraId);
    if (!camera) return;

    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    const category = camera.category || 'other';
    const categoryLabel = CONFIG.CATEGORY_LABELS[category] || 'その他';
    const categoryIcon = CONFIG.CATEGORY_ICONS[category] || 'fa-video';
    const isFav = state.favorites.has(camera.id);

    const title = document.getElementById('modal-title');
    if (title) {
      title.innerHTML = `
        <span>${camera.name}</span>
        <button class="fav-btn modal-fav-btn ${isFav ? 'active' : ''}" data-camera-id="${camera.id}" title="お気に入り登録" onclick="event.stopPropagation();">
          <i class="fa-${isFav ? 'solid' : 'regular'} fa-star"></i>
        </button>
      `;
      const mFavBtn = title.querySelector('.modal-fav-btn');
      if (mFavBtn) {
        mFavBtn.addEventListener('click', (e) => toggleFavorite(camera.id, e));
      }
    }

    const imageArea = document.getElementById('modal-image');
    if (imageArea) {
      if (camera.status === 'maintenance') {
        imageArea.innerHTML = `
          <div class="modal-placeholder" style="color: #9ca3af;">
            <i class="fa-solid fa-wrench"></i>
            <span>現在、機器調整中または休止中のため映像を取得できません。</span>
          </div>`;
      } else if (camera.imageUrl) {
        imageArea.innerHTML = `<img src="${camera.imageUrl}?t=${Date.now()}" alt="${camera.name}" onerror="this.onerror=null; this.outerHTML='<div class=\\'modal-placeholder\\' style=\\'color: #ef4444;\\'><i class=\\'fa-solid fa-triangle-exclamation\\'></i><span>画像取得エラー</span></div>';">`;
      } else if (camera.streamType === 'youtube' && camera.youtubeId) {
        imageArea.innerHTML = `
          <div class="modal-placeholder">
            <i class="fa-brands fa-youtube" style="color: #ef4444;"></i>
            <span>YouTube配信 — 配信元サイトで映像を確認してください</span>
          </div>`;
      } else {
        imageArea.innerHTML = `
          <div class="modal-placeholder">
            <i class="fa-solid ${categoryIcon}"></i>
            <span>配信元サイトで映像を確認してください</span>
          </div>`;
      }
    }

    const details = document.getElementById('modal-details');
    if (details) {
      details.innerHTML = `
        <div class="modal-detail-row">
          <span class="modal-detail-label">カテゴリ</span>
          <span class="modal-detail-value">
            <span class="category-badge badge-${category}">${categoryLabel}</span>
          </span>
        </div>
        <div class="modal-detail-row">
          <span class="modal-detail-label">撮影方向</span>
          <span class="modal-detail-value"><i class="fa-solid fa-compass" style="color: #0284c7;"></i> ${camera.headingName || '概算方向'} (約${camera.heading || 0}°)</span>
        </div>
        <div class="modal-detail-row">
          <span class="modal-detail-label">管理者</span>
          <span class="modal-detail-value">${camera.operator || '不明'}</span>
        </div>
        ${camera.description ? `
        <div class="modal-detail-row">
          <span class="modal-detail-label">説明・設置場所</span>
          <span class="modal-detail-value">${camera.description}</span>
        </div>` : ''}
        <div class="modal-detail-row">
          <span class="modal-detail-label">配信形式</span>
          <span class="modal-detail-value">${camera.streamType === 'youtube' ? 'YouTube Live' : camera.streamType === 'stream' ? '動画ストリーム' : '静止画（定期更新）'}</span>
        </div>
        <div class="modal-detail-row">
          <span class="modal-detail-label">座標</span>
          <span class="modal-detail-value">${camera.lat.toFixed(4)}, ${camera.lng.toFixed(4)}</span>
        </div>
      `;
    }

    const actions = document.getElementById('modal-actions');
    if (actions) {
      actions.innerHTML = `
        <a href="${camera.sourceUrl}" target="_blank" rel="noopener noreferrer" class="btn-modal-source">
          <i class="fa-solid fa-external-link"></i> 配信元サイトを開く
        </a>
      `;
    }

    overlay.classList.add('active');

    if (state.map && !state.isMapCollapsed) {
      state.map.flyTo([camera.lat, camera.lng], 14, { duration: 0.8 });
    }
  }

  window.openModal = openModal;

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  function startAutoRefresh() {
    state.nextRefreshTime = Date.now() + CONFIG.REFRESH_INTERVAL;
    state.refreshTimer = setInterval(refreshImages, CONFIG.REFRESH_INTERVAL);
    state.countdownTimer = setInterval(updateTimer, 1000);
    updateTimer();
  }

  function refreshImages() {
    const images = document.querySelectorAll('.live-image');
    images.forEach(img => {
      const baseSrc = img.getAttribute('data-base-src');
      if (baseSrc) {
        img.src = `${baseSrc}?t=${Date.now()}`;
      }
    });

    state.nextRefreshTime = Date.now() + CONFIG.REFRESH_INTERVAL;
    updateStatusBar();
  }

  function updateTimer() {
    const timerText = document.getElementById('timer-text');
    const progressBar = document.getElementById('timer-progress');
    if (!state.nextRefreshTime) return;

    const remainingMs = Math.max(0, state.nextRefreshTime - Date.now());
    if (timerText) {
      timerText.textContent = `次回更新: ${formatCountdown(remainingMs)}`;
    }
    if (progressBar) {
      const percent = Math.min(100, Math.max(0, (1 - remainingMs / CONFIG.REFRESH_INTERVAL) * 100));
      progressBar.style.width = `${percent}%`;
    }
  }

  function updateStatusBar() {
    const lastUpdate = document.querySelector('.last-update');
    if (lastUpdate) {
      lastUpdate.textContent = `最終更新: ${formatTime(new Date())}`;
    }
  }

  function formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function formatCountdown(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

})();
