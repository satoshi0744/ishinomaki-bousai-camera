/**
 * 石巻管内防災カメラポータルサイト - メインアプリケーションロジック
 */

(function() {
  'use strict';

  // ■ 設定定数
  const CONFIG = {
    MAP_CENTER: [38.434, 141.303],
    MAP_ZOOM: 11,
    REFRESH_INTERVAL: 10 * 60 * 1000,
    CATEGORY_COLORS: { river: '#3b82f6', road: '#f59e0b', coast: '#06b6d4', city: '#10b981', other: '#a78bfa' },
    CATEGORY_LABELS: { river: '河川', road: '道路', coast: '海岸', city: '市街地', other: 'その他' },
    CATEGORY_ICONS: { river: 'fa-water', road: 'fa-road', coast: 'fa-anchor', city: 'fa-building', other: 'fa-video' }
  };

  // ■ 状態管理
  let state = {
    map: null,
    layers: {},
    markers: {},
    activeFilters: new Set(['river', 'road', 'coast', 'city', 'other']),
    searchQuery: '',
    refreshTimer: null,
    countdownTimer: null,
    nextRefreshTime: null,
    activeMarkerId: null,
    accordionStates: {}
  };

  // DOMContentLoaded で初期化
  document.addEventListener('DOMContentLoaded', initApp);

  // ■ 初期化メイン関数
  function initApp() {
    // ★ グローバルディスパッチャの定義 ★
    window.__triggerMarkerAction = function(targetId) {
      if (!targetId) return;
      if (targetId.startsWith('water_')) {
        const stationNo = targetId.replace('water_', '');
        const station = WATER_LEVEL_STATIONS.find(s => (s.stationNo || s.name) === stationNo);
        if (station) openWaterLevelModal(station);
      } else {
        openModal(targetId);
      }
    };

    loadFavorites();
    initMap();
    initMarkers();
    initSidebar();
    initFilters();
    initSearch();
    initModal();
    startAutoRefresh();
    updateStatusBar();
  }

  // ■ 地図の初期化
  function initMap() {
    // ズームコントロールを非表示にして地図を初期化
    state.map = L.map('map', { zoomControl: false }).setView(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM);

    // OSMタイルレイヤーを追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(state.map);

    // 右上にズームコントロールを追加
    L.control.zoom({ position: 'topright' }).addTo(state.map);
  }

  // ■ マーカーアイコンの作成（撮影方向矢印バッジ付き）
  function createMarkerIcon(category, status, heading, headingName) {
    let color = CONFIG.CATEGORY_COLORS[category] || CONFIG.CATEGORY_COLORS.other;
    let iconClass = CONFIG.CATEGORY_ICONS[category] || CONFIG.CATEGORY_ICONS.other;
    
    if (status === 'maintenance') {
      color = '#9ca3af';
      iconClass = 'fa-wrench';
    }
    
    const angle = heading !== undefined ? heading : 45;
    const arrowBadge = `<div class="direction-badge" title="撮影方向: ${headingName || ''}" style="transform: rotate(45deg);">
      <i class="fa-solid fa-arrow-up" style="transform: rotate(${angle}deg); color: #0284c7; font-size: 10px; font-weight: 900;"></i>
    </div>`;
    
    return L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-icon marker-${category}" style="background-color: ${color}; position: relative;">
        <i class="fa-solid ${iconClass}" style="transform: rotate(45deg); color: white; font-size: 12px;"></i>
        ${arrowBadge}
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -36]
    });
  }

  // ■ マーカーの初期化
  function initMarkers() {
    // カテゴリごとに LayerGroup を作成
    Object.keys(CONFIG.CATEGORY_LABELS).forEach(category => {
      state.layers[category] = L.layerGroup().addTo(state.map);
    });

    if (typeof CAMERA_DATA === 'undefined') {
      console.error('CAMERA_DATA が定義されていません。cameras.js が読み込まれているか確認してください。');
      return;
    }

    // カメラデータからマーカーを作成
    CAMERA_DATA.forEach(camera => {
      const category = camera.category || 'other';
      const marker = L.marker([camera.lat, camera.lng], {
        icon: createMarkerIcon(category, camera.status, camera.heading, camera.headingName),
        title: camera.name
      });
      
      // ポップアップの設定
      const categoryLabel = CONFIG.CATEGORY_LABELS[category] || 'その他';
      const popupContent = `
        <div class="hover-popup" style="cursor: pointer;" onclick="event.stopPropagation(); window.__triggerMarkerAction('water_${station.stationNo || station.name}');">
          <div class="hover-popup-title" style="color: ${levelColor};">💧 ${station.name}</div>
          <div style="font-size: 11px; color: var(--text-secondary); margin: 4px 0;">${station.riverName}</div>
          <div style="margin: 4px 0;"><span class="weather-badge ${levelBadgeClass}">${levelText}</span></div>
          <div class="hover-popup-hint" style="color: ${levelColor};"><i class="fa-solid fa-chart-line"></i> タップ／クリックで断面図・リアルタイム水位・予測を表示</div>
        </div>
      `;
      marker.bindPopup(popupContent);

      // 対応するカテゴリのLayerGroupに追加
      if (state.layers[category]) {
        state.layers[category].addLayer(marker);
      }
      
      // 状態管理に保存
      state.markers[camera.id] = marker;
      setupTooltipHoverEvents(marker, camera);
    });

    // ポップアップ内のボタンからのイベントリスナー
    document.addEventListener('open-camera-modal', (e) => {
      openModal(e.detail);
    });
  }

  // ■ マーカー共通のスマートホバー・クリック・自動消去遅延バインド関数
  function setupTooltipHoverEvents(marker, camera = null, isWater = false, station = null) {
    const markerId = camera ? camera.id : (station ? 'water_' + (station.stationNo || station.name) : null);

    const smartOpenTooltip = () => {
      const currentTooltip = marker.getTooltip();
      if (!currentTooltip) return;

      const config = calculateSmartDirectionAndOffset(marker);
      const content = currentTooltip.getContent();
      const className = currentTooltip.options.className || 'custom-smart-tooltip';

      marker.unbindTooltip();
      marker.bindTooltip(content, {
        direction: config.direction,
        interactive: true,
        className: className,
        offset: config.offset
      }).openTooltip();
    };

    const syncSidebar = () => {
      if (camera) {
        const gMeta = getGroupForCamera(camera);
        state.accordionStates[gMeta.id] = true;
        const groupEl = document.querySelector(`.accordion-group[data-group-id="${gMeta.id}"]`);
        if (groupEl && !groupEl.classList.contains('open')) {
          groupEl.classList.add('open');
        }
        setTimeout(() => {
          const card = document.querySelector(`.camera-card[data-camera-id="${camera.id}"]`);
          const listContainer = document.getElementById('camera-list');
          if (card && listContainer) {
            const listRect = listContainer.getBoundingClientRect();
            const cardRect = card.getBoundingClientRect();
            const isVisible = (cardRect.top >= listRect.top) && (cardRect.bottom <= listRect.bottom);
            if (!isVisible) {
              listContainer.scrollBy({
                top: cardRect.top - listRect.top - 20,
                behavior: 'smooth'
              });
            }
            card.classList.add('card-highlight');
            setTimeout(() => card.classList.remove('card-highlight'), 2000);
          }
        }, 150);
      }
    };

    // クリック・タップ時の挙動（スマホ：1回目でポップアップ展開、2回目で遷移 / PC：即遷移）
    marker.on('click', (e) => {
      if (e && e.originalEvent) {
        L.DomEvent.stopPropagation(e.originalEvent);
      }

      // すでにこのマーカーがアクティブ（ポップアップ表示中）だった場合 -> 2回目タップで遷移
      if (state.activeMarkerId === markerId) {
        window.__triggerMarkerAction(markerId);
      } else {
        // 初回タップ時 -> アクティブ状態にセットし、ポップアップを開く
        state.activeMarkerId = markerId;
        smartOpenTooltip();
        syncSidebar();
      }
    });

    // マウスホバー時（PC）
    marker.on('mouseover', () => {
      state.activeMarkerId = markerId; // PCホバー時もアクティブにしておくことで、直後のクリックで確実に遷移
      smartOpenTooltip();
      syncSidebar();
    });

    // tooltipopenでのonclick登録は廃止（HTMLインラインで直接バインドしたため不要）
  }

  // ■ サイドバーのカードHTML生成
  function renderCameraCard(camera) {
    const category = camera.category || 'other';
    const categoryLabel = CONFIG.CATEGORY_LABELS[category] || 'その他';
    const categoryIcon = CONFIG.CATEGORY_ICONS[category] || 'fa-video';
    
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
      <div class="camera-card ${camera.status === 'maintenance' ? 'maintenance' : ''}" data-camera-id="${camera.id}" data-category="${category}">
        <div class="card-header">
          <span class="card-name">${camera.name}</span>
          <span class="category-badge badge-${category}">${categoryLabel}</span>
        </div>
        <div class="card-preview">
          ${previewHtml}
        </div>
        <div class="card-info">
          <span class="card-operator"><i class="fa-solid fa-user-shield"></i> ${camera.operator || '管理者不明'}</span>
          <span class="card-desc">${camera.description || ''}</span>
        </div>
        <div class="card-actions">
          <a href="${camera.sourceUrl}" target="_blank" rel="noopener noreferrer" class="btn-source" onclick="event.stopPropagation();">
            配信元を開く <i class="fa-solid fa-external-link"></i>
          </a>
        </div>
      </div>
    `;
  }

  // ■ サイドバーの初期化
  function initSidebar() {
    const listContainer = document.getElementById('camera-list');
    if (!listContainer || typeof CAMERA_DATA === 'undefined') return;

    let html = '';
    CAMERA_DATA.forEach(camera => {
      html += renderCameraCard(camera);
    });
    listContainer.innerHTML = html;

    // イベントリスナーの追加
    const cards = listContainer.querySelectorAll('.camera-card');
    cards.forEach(card => {
      // クリックでモーダルを開く
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-camera-id');
        openModal(id);
      });

      // ホバーでマーカーをハイライト
      card.addEventListener('mouseenter', () => {
        const id = card.getAttribute('data-camera-id');
        const marker = state.markers[id];
        if (marker) {
          marker.setZIndexOffset(1000);
        }
      });

      card.addEventListener('mouseleave', () => {
        const id = card.getAttribute('data-camera-id');
        const marker = state.markers[id];
        if (marker) {
          marker.setZIndexOffset(0);
        }
      });
    });

    // サイドバーの件数更新
    updateSidebarCount();
  }

  // ■ フィルタの初期化
  function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = e.currentTarget.getAttribute('data-category');
        
        if (state.activeFilters.has(category)) {
          state.activeFilters.delete(category);
          e.currentTarget.classList.remove('active');
          if (state.layers[category]) {
            state.map.removeLayer(state.layers[category]);
          }
        } else {
          state.activeFilters.add(category);
          e.currentTarget.classList.add('active');
          if (state.layers[category]) {
            state.map.addLayer(state.layers[category]);
          }
        }
        
        applyFilters();
      });
    });
  }

  // ■ 検索の初期化
  function initSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        applyFilters();
      });
    }
  }

  // ■ フィルタの適用（検索＋カテゴリ）
  function applyFilters() {
    const cards = document.querySelectorAll('.camera-card');
    let visibleCount = 0;

    cards.forEach(card => {
      const id = card.getAttribute('data-camera-id');
      const category = card.getAttribute('data-category');
      
      const camera = CAMERA_DATA.find(c => c.id === id);
      const name = camera ? camera.name.toLowerCase() : '';
      const desc = camera && camera.description ? camera.description.toLowerCase() : '';
      const operator = camera && camera.operator ? camera.operator.toLowerCase() : '';
      
      const matchesCategory = state.activeFilters.has(category);
      const matchesSearch = state.searchQuery === '' ||
        name.includes(state.searchQuery) || 
        desc.includes(state.searchQuery) ||
        operator.includes(state.searchQuery);

      if (matchesCategory && matchesSearch) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    // 0件メッセージの表示制御
    const noResults = document.getElementById('no-results');
    if (noResults) {
      noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    // サイドバー件数更新
    updateSidebarCount(visibleCount);

    // ステータスバー更新
    const countDisplay = document.querySelector('.camera-count');
    if (countDisplay) {
      countDisplay.textContent = `表示 ${visibleCount} / 全 ${CAMERA_DATA.length} 台`;
    }
  }

  // ■ サイドバー件数の更新
  function updateSidebarCount(count) {
    const sidebarCount = document.getElementById('sidebar-count');
    if (sidebarCount) {
      const total = typeof CAMERA_DATA !== 'undefined' ? CAMERA_DATA.length : 0;
      const visible = count !== undefined ? count : total;
      sidebarCount.textContent = `${visible} / ${total} 台`;
    }
  }

  // ■ モーダルの初期化
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

    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ■ モーダルを開く
  function openModal(cameraId) {
    const camera = CAMERA_DATA.find(c => c.id === cameraId);
    if (!camera) return;

    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    const category = camera.category || 'other';
    const categoryLabel = CONFIG.CATEGORY_LABELS[category] || 'その他';
    const categoryIcon = CONFIG.CATEGORY_ICONS[category] || 'fa-video';

    // タイトル更新
    const title = document.getElementById('modal-title');
    if (title) title.textContent = camera.name;

    // 画像エリア更新
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

    // 詳細情報更新
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
          <span class="modal-detail-label">説明</span>
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

    // アクションボタン更新
    const actions = document.getElementById('modal-actions');
    if (actions) {
      actions.innerHTML = `
        <a href="${camera.sourceUrl}" target="_blank" rel="noopener noreferrer" class="btn-modal-source">
          <i class="fa-solid fa-external-link"></i> 配信元サイトを開く
        </a>
      `;
    }

    // モーダルを表示
    overlay.classList.add('active');

    // 地図をパン
    if (state.map) {
      state.map.flyTo([camera.lat, camera.lng], 14, { duration: 0.8 });
    }
  }

  // グローバルからのアクセス用（ポップアップボタンのonclick等）
  window.openModal = openModal;

  // ■ モーダルを閉じる
  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  // ■ 自動更新タイマーの開始
  function startAutoRefresh() {
    state.nextRefreshTime = Date.now() + CONFIG.REFRESH_INTERVAL;
    
    // 画像更新タイマー
    state.refreshTimer = setInterval(refreshImages, CONFIG.REFRESH_INTERVAL);
    
    // カウントダウン表示タイマー
    state.countdownTimer = setInterval(updateTimer, 1000);
    
    // 初回表示
    updateTimer();
  }

  // ■ 画像の更新（キャッシュバスティング）
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
    console.log(`[${formatTime(new Date())}] カメラ画像を更新しました`);
  }

  // ■ カウントダウンタイマーの更新
  function updateTimer() {
    const timerText = document.getElementById('timer-text');
    if (!timerText || !state.nextRefreshTime) return;

    const remainingMs = Math.max(0, state.nextRefreshTime - Date.now());
    timerText.textContent = `次回更新: ${formatCountdown(remainingMs)}`;
  }

  // ■ ステータスバーの更新
  function updateStatusBar() {
    const lastUpdate = document.querySelector('.last-update');
    const countDisplay = document.querySelector('.camera-count');
    
    if (lastUpdate) {
      lastUpdate.textContent = `最終更新: ${formatTime(new Date())}`;
    }
    
    if (countDisplay && typeof CAMERA_DATA !== 'undefined') {
      countDisplay.textContent = `全 ${CAMERA_DATA.length} 台`;
    }
  }

  // ■ ユーティリティ: 時刻フォーマット
  function formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // ■ ユーティリティ: カウントダウンフォーマット
  function formatCountdown(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

})();
