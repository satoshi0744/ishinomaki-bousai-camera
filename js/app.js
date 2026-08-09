/**
 * 石巻圏 リアルタイム定点観測ビューア - メインアプリケーションロジック
 */

(function() {
  'use strict';

  // ■ 設定定数
  const CONFIG = {
    MAP_CENTER: [38.550, 141.150],
    MAP_ZOOM: 10,
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

    if (category === 'road' || name.includes('IC') || name.includes('三陸沿岸')) {
      return { id: 'group_road', title: '🚗 道路・三陸沿岸道路IC', icon: 'fa-road', order: 10, defaultOpen: false };
    }

    if (name.includes('[岩手県]')) {
      return { id: 'group_iwate', title: '🏔️ 岩手県：北上川上流・中流域', icon: 'fa-mountain-sun', order: 9, defaultOpen: false };
    }

    // 石巻圏：旧北上川水系
    if (name.includes('旧北上川') || name.includes('日和山') || name.includes('住吉') || name.includes('神取橋') || name.includes('内海橋') || name.includes('脇谷') || name.includes('石巻大橋') || name.includes('真野川') || name.includes('大森')) {
      return { id: 'group_kyu_kitakami', title: '🌊 石巻圏：旧北上川水系', icon: 'fa-water', order: 2, defaultOpen: true };
    }

    // 石巻圏：北上川下流
    if (name.includes('北上川') && (name.includes('飯野川') || name.includes('福地') || name.includes('釜谷') || name.includes('新北上') || name.includes('下流') || name.includes('樫崎') || name.includes('橋浦'))) {
      return { id: 'group_kitakami', title: '🌊 石巻圏：北上川下流', icon: 'fa-water', order: 3, defaultOpen: true };
    }

    // 石巻圏・東松島：鳴瀬・吉田川下流
    if (name.includes('鳴瀬') || name.includes('吉田川') || name.includes('東名運河') || name.includes('鞍坪') || name.includes('小野橋') || name.includes('入釜谷') || name.includes('出来川') || name.includes('中島川') || name.includes('加茂川') || name.includes('内の原') || name.includes('高木川') || name.includes('大沢川') || name.includes('皿貝川')) {
      return { id: 'group_naruse', title: '🌊 石巻圏・東松島：鳴瀬川・吉田川・運河', icon: 'fa-water', order: 4, defaultOpen: true };
    }

    // 登米・栗原・迫川
    if (name.includes('登米') || name.includes('栗原') || name.includes('迫川') || name.includes('錦桜') || name.includes('若柳') || name.includes('山吉田')) {
      return { id: 'group_tome_kurihara', title: '🌊 登米・栗原・迫川水系（上流域）', icon: 'fa-water', order: 5, defaultOpen: false };
    }

    // 大崎・加美・江合川
    if (name.includes('大崎') || name.includes('加美') || name.includes('古川') || name.includes('美里') || name.includes('涌谷') || name.includes('江合川') || name.includes('三本木') || name.includes('野田橋')) {
      return { id: 'group_osaki_kami', title: '🌊 大崎・加美・江合川水系（上流域）', icon: 'fa-water', order: 6, defaultOpen: false };
    }

    // 気仙沼・南三陸
    if (name.includes('気仙沼') || name.includes('南三陸') || name.includes('志津川') || name.includes('津谷') || name.includes('本吉')) {
      return { id: 'group_kesennuma', title: '🌊 気仙沼・本吉・南三陸エリア', icon: 'fa-fish', order: 7, defaultOpen: false };
    }

    // 仙台・仙塩・県南
    if (name.includes('仙台') || name.includes('名取') || name.includes('塩竈') || name.includes('松島') || name.includes('七北田') || name.includes('阿武隈') || name.includes('岩沼') || name.includes('亘理')) {
      return { id: 'group_sendai', title: '🌊 仙台・仙塩・県南エリア', icon: 'fa-building-flag', order: 8, defaultOpen: false };
    }

    return { id: 'group_other_river', title: '🌊 その他河川・観測所', icon: 'fa-water', order: 11, defaultOpen: false };
  }

  // ■ 状態管理
  let state = {
    map: null,
    layers: {},
    markers: {},
    activeCategoryFilters: new Set(['river', 'road', 'coast', 'city', 'other']),
    activeOperatorFilter: 'all',
    activeAreaFilter: localStorage.getItem('ishinomaki_area_filter') || 'ishinomaki', // ★初期値を「石巻圏」に設定（軽量化）
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
    initBottomTabs();
    initAreaFilter();
    initFilters();
    initSearch();
    initModal();
    initInfoModal();
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

    // カテゴリ別レイヤーグループの作成
    state.layers = {
      river: L.layerGroup().addTo(state.map),
      road: L.layerGroup().addTo(state.map),
      water_level: L.layerGroup().addTo(state.map)
    };

    // ズームレベル連動（広域表示時のコンパクトドット化）
    function updateZoomClass() {
      const currentZoom = state.map.getZoom();
      const container = state.map.getContainer();
      if (currentZoom < 12) {
        container.classList.add('zoom-low');
      } else {
        container.classList.remove('zoom-low');
      }
    }

    state.map.on('zoomend', updateZoomClass);
    updateZoomClass(); // 初期状態の判定
    initWaterLevelMarkers(); // 水位観測所マーカーの配置
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

  // ■ エリア（管内）判定ロジック
  function getAreaForCamera(camera) {
    const name = camera.name || '';
    const group = getGroupForCamera(camera);
    
    if (group.id === 'group_kyu_kitakami' || group.id === 'group_kitakami' || group.id === 'group_naruse' || name.includes('石巻') || name.includes('東松島') || name.includes('女川') || name.includes('牡鹿')) return 'ishinomaki';
    if (group.id === 'group_tome_kurihara' || name.includes('登米') || name.includes('栗原')) return 'tome';
    if (group.id === 'group_osaki_kami' || name.includes('大崎') || name.includes('加美') || name.includes('色麻') || name.includes('美里') || name.includes('涌谷')) return 'osaki';
    if (group.id === 'group_sendai' || name.includes('仙台') || name.includes('名取') || name.includes('塩竈') || name.includes('松島') || name.includes('岩沼')) return 'sendai';
    if (group.id === 'group_kesennuma' || name.includes('気仙沼') || name.includes('南三陸') || name.includes('本吉')) return 'kesennuma';
    
    return 'all'; // その他（岩手など）はallで表示
  }

  // ■ エリアフィルターの初期化
  function initAreaFilter() {
    const btn = document.getElementById('area-select-btn');
    const modal = document.getElementById('area-modal-overlay');
    const closeBtn = document.getElementById('area-modal-close');
    const options = document.querySelectorAll('.area-option-btn');
    const currentText = document.getElementById('current-area-text');
    
    if (!btn || !modal) return;
    
    // 初期テキストの設定
    const initialOption = Array.from(options).find(opt => opt.getAttribute('data-area') === state.activeAreaFilter);
    if (initialOption && currentText) {
      currentText.textContent = initialOption.textContent.split('（')[0]; // カッコ以降を省略
      options.forEach(o => o.classList.remove('active'));
      initialOption.classList.add('active');
    }

    btn.addEventListener('click', () => {
      modal.classList.add('show');
    });
    
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('show');
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('show');
    });

    options.forEach(opt => {
      opt.addEventListener('click', () => {
        const area = opt.getAttribute('data-area');
        state.activeAreaFilter = area;
        localStorage.setItem('ishinomaki_area_filter', area);
        
        options.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        if (currentText) currentText.textContent = opt.textContent.split('（')[0];
        
        modal.classList.remove('show');
        applyAllFilters(); // マーカーとリストを再描画
      });
    });
  }

  // ■ すべてのフィルター（カテゴリー、管理者、エリア、検索）を地図マーカーに適用
  function applyAllFilters() {
    renderSidebarList(); // サイドバーの更新

    // 地図のマーカーを更新
    if (!state.map || !CAMERA_DATA) return;
    
    CAMERA_DATA.forEach(camera => {
      const marker = state.markers[camera.id];
      if (!marker) return;

      const category = camera.category || 'other';
      const operator = camera.operator || '';
      const area = getAreaForCamera(camera);
      
      const matchesCategory = state.activeCategoryFilters.has(category);
      let matchesOperator = state.activeOperatorFilter === 'all' || 
                           (state.activeOperatorFilter === 'mlit' && operator.includes('国土交通省')) || 
                           (state.activeOperatorFilter === 'miyagi' && operator.includes('宮城県'));
      const matchesArea = state.activeAreaFilter === 'all' || area === state.activeAreaFilter || area === 'all';
      
      const layerGroup = state.layers[category];
      if (layerGroup) {
        if (matchesCategory && matchesOperator && matchesArea) {
          if (!layerGroup.hasLayer(marker)) {
            layerGroup.addLayer(marker);
          }
        } else {
          if (layerGroup.hasLayer(marker)) {
            layerGroup.removeLayer(marker);
          }
        }
      }
    });
  }

  // ■ ボトムタブの初期化（スマホ用）
  function initBottomTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const mainContent = document.getElementById('main-content');
    
    if (tabs.length === 0 || !mainContent) return;
    
    // 初期状態設定（スマホ時用クラス）
    mainContent.classList.add('show-map');
    mainContent.classList.remove('show-list');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // アクティブ状態の切り替え
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const target = tab.getAttribute('data-tab');
        if (target === 'map') {
          mainContent.classList.add('show-map');
          mainContent.classList.remove('show-list');
          // 地図のサイズ再計算
          setTimeout(() => {
            if (state.map) state.map.invalidateSize();
          }, 300);
        } else if (target === 'list') {
          mainContent.classList.add('show-list');
          mainContent.classList.remove('show-map');
        }
      });
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
                 <i class="fa-solid ${iconClass}" style="color: white; font-size: 10px;"></i>
               </div>
             </div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -10]
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
      let popupImgHtml = '';
      if (camera.imageUrl) {
        popupImgHtml = `<img src="${camera.imageUrl}" class="hover-popup-img" alt="${camera.name}">`;
      } else {
        popupImgHtml = `<div class="hover-popup-noimg">配信元サイトで映像確認</div>`;
      }

      const popupContent = `
        <div class="hover-popup">
          <div class="hover-popup-title">${camera.name}</div>
          ${popupImgHtml}
          <div class="hover-popup-hint"><i class="fa-solid fa-expand"></i> ピンをクリックで大画面表示</div>
        </div>
      `;
      marker.bindPopup(popupContent, { closeButton: false, offset: [0, -10] });

      // ピン直接クリック時：大画面映像モーダルを表示
      marker.on('click', () => {
        openModal(camera.id);
      });

      // マーカーにマウスを乗せた時：小画像ポップアップを開き、右側リストを連携スクロール
      marker.on('mouseover', () => {
        // 小画像ポップアップを表示（他のポップアップは自動で閉じます）
        marker.openPopup();

        // 右側サイドバーの連携スクロール
        const gMeta = getGroupForCamera(camera);
        state.accordionStates[gMeta.id] = true;
        const groupEl = document.querySelector(`.accordion-group[data-group-id="${gMeta.id}"]`);
        if (groupEl && !groupEl.classList.contains('open')) {
          groupEl.classList.add('open');
        }
        const card = document.querySelector(`.camera-card[data-camera-id="${camera.id}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          card.classList.add('card-highlight');
          setTimeout(() => card.classList.remove('card-highlight'), 2000);
        }
      });

      // マーカーからマウスが離れた時：小画像ポップアップを自動で閉じる
      marker.on('mouseout', () => {
        marker.closePopup();
      });

      if (state.layers[category]) {
        // 初期状態ではフィルターを適用した結果に基づいてレイヤーに追加するか決めるため、ここでは追加しない
        // applyAllFilters() が後に呼ばれることで正しい状態になる
      }
      
      state.markers[camera.id] = marker;
    });

    // 初期化時にすべてのマーカーにフィルターを適用して地図に配置する
    setTimeout(applyAllFilters, 100);

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
      const area = getAreaForCamera(camera);

      const matchesCategory = state.activeCategoryFilters.has(category);
      let matchesOperator = true;
      if (state.activeOperatorFilter === 'mlit') {
        matchesOperator = operator.includes('国土交通省');
      } else if (state.activeOperatorFilter === 'miyagi') {
        matchesOperator = operator.includes('宮城県');
      }
      
      const matchesArea = state.activeAreaFilter === 'all' || area === state.activeAreaFilter || area === 'all';

      const q = state.searchQuery.toLowerCase();
      const matchesSearch = q === '' ||
        camera.name.toLowerCase().includes(q) ||
        (camera.description && camera.description.toLowerCase().includes(q)) ||
        operator.toLowerCase().includes(q);

      if (!matchesCategory || !matchesOperator || !matchesArea || !matchesSearch) {
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

      const isOpen = state.accordionStates[group.id] !== undefined
        ? state.accordionStates[group.id]
        : (group.defaultOpen !== false);

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
        if (marker) {
          marker.setZIndexOffset(2000);
          const el = marker.getElement();
          if (el) el.classList.add('marker-active');
        }
      });

      card.addEventListener('mouseleave', () => {
        const id = card.getAttribute('data-camera-id');
        const marker = state.markers[id];
        if (marker) {
          marker.setZIndexOffset(0);
          const el = marker.getElement();
          if (el) el.classList.remove('marker-active');
        }
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
  window.closeModal = closeModal;

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

  // ■ 水位観測所（◯）マーカーの配置とホバー・クリック連携
  function initWaterLevelMarkers() {
    if (typeof WATER_LEVEL_STATIONS === 'undefined' || !state.layers['water_level']) return;

    WATER_LEVEL_STATIONS.forEach(station => {
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-wrapper">
                 <div class="marker-icon water-level-marker-icon" title="${station.name}">
                   <i class="fa-solid fa-droplet" style="color: white; font-size: 10px;"></i>
                 </div>
               </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([station.lat, station.lng], { icon: customIcon });

      const popupContent = `
        <div class="hover-popup">
          <div class="hover-popup-title" style="color: #10b981;">💧 ${station.name}</div>
          <div style="font-size: 11px; color: var(--text-secondary); margin: 4px 0;">${station.riverName}</div>
          <div class="hover-popup-hint" style="color: #10b981;"><i class="fa-solid fa-chart-line"></i> クリックで断面図・リアルタイム水位・予測を表示</div>
        </div>
      `;
      marker.bindPopup(popupContent, { closeButton: false, offset: [0, -10] });

      // ピンホバー時：小画像ポップアップを開く
      marker.on('mouseover', () => {
        marker.openPopup();
      });

      // ピン離脱時：小ポップアップを閉じる
      marker.on('mouseout', () => {
        marker.closePopup();
      });

      // ピン直接クリック時：添付画像の画面がそのままモーダル内に開く（方法1：リアルタイム画面埋め込み）
      marker.on('click', () => {
        openWaterLevelModal(station);
      });

      state.layers['water_level'].addLayer(marker);
    });
  }

  // ■ 水位観測所 大画面モーダル表示（特定局のリアルタイム水位経過表・断面図に直リンク）
  function openWaterLevelModal(station) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    const title = document.getElementById('modal-title');
    if (title) {
      title.innerHTML = `<span style="color: #10b981;">💧 ${station.name} — リアルタイム水位経過表・断面図</span>`;
    }

    const imageArea = document.getElementById('modal-image');
    if (imageArea) {
      imageArea.innerHTML = `
        <div class="modal-placeholder" style="color: var(--text-primary); display: flex; flex-direction: column; gap: 1.2rem; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 2rem; background: var(--bg-tertiary);">
          <i class="fa-solid fa-chart-line" style="font-size: 3.5rem; color: #10b981;"></i>
          <p style="font-size: 1.2rem; font-weight: bold; line-height: 1.5;">
            「${station.name}」のリアルタイム水位グラフ・断面図を表示します
          </p>
          <a href="${station.systemUrl}" target="_blank" rel="noopener noreferrer" onclick="closeModal();" style="display: inline-flex; align-items: center; gap: 10px; padding: 14px 28px; background: linear-gradient(135deg, #059669, #10b981); color: white; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 1.15rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1.0)'">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> 「${station.name}」の水位経過表・断面図（宮城県システム）を開く
          </a>
        </div>
      `;
    }

    const details = document.getElementById('modal-details');
    if (details) {
      details.innerHTML = `
        <div class="modal-detail-row">
          <span class="modal-detail-label">観測局名</span>
          <span class="modal-detail-value" style="font-weight: 700; color: #10b981;">${station.name} (${station.stationNo})</span>
        </div>
        <div class="modal-detail-row">
          <span class="modal-detail-label">河川名</span>
          <span class="modal-detail-value">${station.riverName}</span>
        </div>
        <div class="modal-detail-row">
          <span class="modal-detail-label">所在地</span>
          <span class="modal-detail-value">${station.address}</span>
        </div>
        <div class="modal-detail-row">
          <span class="modal-detail-label">管理者</span>
          <span class="modal-detail-value">${station.operator}</span>
        </div>
      `;
    }

    const actions = document.getElementById('modal-actions');
    if (actions) {
      actions.innerHTML = ``;
    }

    overlay.classList.add('active');
  }

  // 独立したサブウィンドウ（ポップアップ画面）を起動する共通関数（グローバルに露出）
  window.openStationSubWindow = function(url) {
    const width = 960;
    const height = 720;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);
    window.open(
      url,
      'water_level_subwindow',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no`
    );
  };

  // ■ 使い方・凡例モーダルの初期化
  function initInfoModal() {
    const btn = document.getElementById('info-btn');
    const modal = document.getElementById('info-modal-overlay');
    const closeBtn = document.getElementById('info-modal-close');
    
    if (!btn || !modal) return;
    
    btn.addEventListener('click', () => {
      modal.classList.add('show');
    });
    
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('show');
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('show');
    });
  }


})();
