/* 跟拉拉熊一起吃：三個分頁（美食地圖／美食清單／我的紀錄）
   - 資料：data.js（Google 地圖清單）、posts.js（拉拉熊的 Threads 文章）
   - 我的紀錄：沒設定 Firebase 時存在瀏覽器；設定後用 Google 登入同步（cloud.js） */
(function () {
  'use strict';
  const D = window.LALA_DATA || { visited: [], wish: [], lists: {} };
  const POSTS = window.LALA_POSTS || {};
  const CLOUD = !!(window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey);
  const ORDER = ['台式小吃・飯', '麵食・水餃', '牛肉麵・牛肉湯', '拉麵', '燒烤・鍋物', '異國料理', '早午餐・漢堡・麵包', '甜點・冰品', '飲料・咖啡・酒', '其他美食', '景點・生活'];
  const CITY_ORDER = ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '台中市', '嘉義市', '台南市', '高雄市', '屏東縣', '金門縣', '日本', '其他'];
  const SHARE_LINKS = { visited: 'https://maps.app.goo.gl/HtRYE5HMD8fn4ozE6', wish: 'https://maps.app.goo.gl/9F4STeGY5pzf7cwi8' };
  const TW_BOUNDS = [[21.85, 119.9], [25.35, 122.05]];

  const visitedIds = new Set(D.visited.map(p => p.cid));
  const wishIds = new Set(D.wish.map(p => p.cid));
  const allPlaces = new Map([...D.wish, ...D.visited].map(p => [p.cid, p]));
  const postsOf = p => POSTS[p.cid] || [];

  /* ---------- 小工具 ---------- */
  const $ = id => document.getElementById(id);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const district = p => { const m = p.addr.match(/[市縣](.{1,3}?[區鎮鄉市])/); return m ? m[1] : ''; };
  const shortCity = c => c === '日本' ? c : c.replace(/[市縣]$/, '');
  const placeOf = p => [shortCity(p.city), district(p)].filter(Boolean).join('・');
  const fmtDate = d => d.replace(/^(\d{4})-0?(\d+)-0?(\d+)$/, '$1/$2/$3');
  const mobile = () => matchMedia('(max-width: 760px)').matches;
  const smooth = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const I = {
    heart: '<svg class="fav" viewBox="0 0 24 24" fill="currentColor" aria-label="愛心清單"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.6 2.6.9-1.5 2.5-2.6 4.6-2.6 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z"/></svg>',
    heartS: '<svg class="heart" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.6 2.6.9-1.5 2.5-2.6 4.6-2.6 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    nav: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11 21 3l-8 18-2-8z"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4z"/><path d="M12 7v6M9 10h6"/></svg>',
    saved: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    bowl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18a9 9 0 0 1-18 0zM8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3"/></svg>',
    quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.2-4.6A8 8 0 1 1 21 12z"/></svg>',
    dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    g: '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>',
  };

  /* ---------- 狀態 ---------- */
  const state = {
    tab: ((location.hash || '#map').slice(1).split('/')[0]) || 'map',
    view: load('lala-view', 'visited'),       // visited | wish
    cats: new Set(), cities: new Set(), postOnly: false, q: '',
    sort: load('lala-sort', 'cat'),
    layout: load('lala-layout', 'cards'),      // cards | rows
    sel: null,                                  // 地圖上選中的店
    meTab: 'eaten',
  };
  if (!['visited', 'wish'].includes(state.view)) state.view = 'visited';

  /* ---------- 我的紀錄：吃過／已存到地圖 ---------- */
  const Marks = {
    user: null, ready: !CLOUD, cloudLoaded: false,
    data: load('lala-marks', { eaten: {}, saved: {} }),
    has(kind, cid) { return !!(this.data[kind] && this.data[kind][cid]); },
    count(kind) { return Object.keys(this.data[kind] || {}).filter(c => allPlaces.has(c)).length; },
    set(kind, cid, on) {
      const bag = this.data[kind] || (this.data[kind] = {});
      if (on) bag[cid] = Date.now(); else delete bag[cid];
      this.persist();
      refreshMarks(cid);
    },
    toggle(kind, cid) { this.set(kind, cid, !this.has(kind, cid)); return this.has(kind, cid); },
    persist() {
      if (this.user && window.LalaCloud) {
        window.LalaCloud.save(this.data).catch(err => { console.error(err); toast('雲端同步失敗，請稍後再試。'); });
      } else {
        store('lala-marks', this.data);
      }
    },
  };
  const clean = m => ({ eaten: { ...(m && m.eaten) }, saved: { ...(m && m.saved) } });

  window.addEventListener('lala-user', e => {
    const u = e.detail.user;
    Marks.user = u; Marks.ready = true; Marks.cloudLoaded = false;
    if (!u) Marks.data = load('lala-marks', { eaten: {}, saved: {} });
    renderAuth(); renderBadge();
    if (state.tab === 'me') renderMe();
    refreshAllMarks();
  });
  window.addEventListener('lala-marks', e => {
    if (!Marks.user) return;
    const cloud = clean(e.detail.marks);
    if (!Marks.cloudLoaded) {
      Marks.cloudLoaded = true;
      // 第一次登入：把這台裝置先前的標記合併上去
      const local = clean(load('lala-marks', null));
      const n = Object.keys(local.eaten).length + Object.keys(local.saved).length;
      if (n) {
        Object.assign(cloud.eaten, local.eaten); Object.assign(cloud.saved, local.saved);
        Marks.data = cloud; Marks.persist(); store('lala-marks', { eaten: {}, saved: {} });
        toast(`已把這台裝置的 ${n} 筆標記同步到你的帳號。`);
      } else Marks.data = cloud;
    } else Marks.data = cloud;
    renderBadge(); refreshAllMarks();
    if (state.tab === 'me') renderMe();
  });
  window.addEventListener('lala-cloud-error', () => {
    Marks.ready = true; renderAuth();
    toast('Google 登入暫時無法使用，標記會先存在這台裝置。');
  });

  /* ---------- 篩選 ---------- */
  function list() { return state.view === 'visited' ? D.visited : D.wish; }
  function matches(p, skip) {
    if (skip !== 'cat' && state.cats.size && !state.cats.has(p.cat)) return false;
    if (skip !== 'city' && state.cities.size && !state.cities.has(p.city)) return false;
    if (skip !== 'post' && state.postOnly && !postsOf(p).length) return false;
    if (state.q) {
      const hay = (p.name + p.addr + p.cat + postsOf(p).map(x => x.text).join('')).toLowerCase();
      if (!hay.includes(state.q.toLowerCase())) return false;
    }
    return true;
  }
  const filtered = () => list().filter(p => matches(p));
  const activeFilters = () => state.cities.size + state.cats.size + (state.postOnly ? 1 : 0) + (state.q ? 1 : 0);

  function chipsHtml(values, selected, counts, key) {
    return values.map(v => {
      const on = v === '全部' ? selected.size === 0 : selected.has(v);
      const label = v === '全部' ? v : (key === 'city' ? shortCity(v) : v);
      return `<button class="chip" type="button" aria-pressed="${on}" data-${key}="${esc(v)}">${label}<span class="c">${counts(v)}</span></button>`;
    }).join('');
  }
  function renderFilters() {
    const all = list();
    const cities = CITY_ORDER.filter(c => all.some(p => p.city === c));
    state.cities.forEach(c => { if (!cities.includes(c)) state.cities.delete(c); });
    const cats = ORDER.filter(c => all.some(p => p.cat === c));
    state.cats.forEach(c => { if (!cats.includes(c)) state.cats.delete(c); });
    const cityPool = all.filter(p => matches(p, 'city'));
    $('cities').innerHTML = chipsHtml(['全部', ...cities], state.cities, v => v === '全部' ? cityPool.length : cityPool.filter(p => p.city === v).length, 'city');
    const catPool = all.filter(p => matches(p, 'cat'));
    $('chips').innerHTML = chipsHtml(['全部', ...cats], state.cats, v => v === '全部' ? catPool.length : catPool.filter(p => p.cat === v).length, 'cat');
    const postPool = all.filter(p => matches(p, 'post'));
    $('extras').innerHTML = `<button class="chip" type="button" aria-pressed="${state.postOnly}" data-post>只看有拉拉熊文章<span class="c">${postPool.filter(p => postsOf(p).length).length}</span></button>`;
    const n = activeFilters();
    $$('.filter-label').forEach(el => { el.textContent = n ? `篩選（${n}）` : '篩選'; el.closest('.pill').classList.toggle('on', n > 0); });
    $('filter-dlg-n').textContent = filtered().length;
  }
  function toggleIn(set, v) { if (v === '全部') set.clear(); else if (set.has(v)) set.delete(v); else set.add(v); }

  // 篩選區只有一份：依分頁與螢幕大小放到不同位置
  function placeFilters() {
    const f = $('filters');
    const slot = mobile() ? $('slot-sheet') : state.tab === 'list' ? $('slot-list') : $('slot-map');
    if (f.parentNode !== slot) slot.appendChild(f);
  }

  function renderSeg() {
    const html = `<div class="seg" role="group" aria-label="清單">
      <button type="button" data-src="visited" aria-pressed="${state.view === 'visited'}">${I.check}已去過<span class="n">${D.visited.length}</span></button>
      <button type="button" data-src="wish" aria-pressed="${state.view === 'wish'}">${I.heartS}愛心<span class="n">${D.wish.length}</span></button>
    </div>`;
    $$('.seg-slot').forEach(s => { s.innerHTML = html; });
  }

  /* ---------- 共用片段 ---------- */
  function marksHtml(p, small) {
    const e = Marks.has('eaten', p.cid), s = Marks.has('saved', p.cid);
    return `<div class="marks">
      <button type="button" class="mark" data-mark="eaten" data-cid="${p.cid}" aria-pressed="${e}" title="標記我吃過">${I.bowl}<span>${e ? '我吃過' : (small ? '吃過' : '我吃過？')}</span></button>
      <button type="button" class="mark" data-mark="saved" data-cid="${p.cid}" aria-pressed="${s}" title="標記已存到我的 Google 地圖">${s ? I.saved : I.save}<span>${s ? '已存地圖' : '存了嗎？'}</span></button>
    </div>`;
  }
  function iconsHtml(p) {
    return `<span class="icons">
      ${postsOf(p).length ? `<span class="ico-post" title="有拉拉熊文章">${I.quote}</span>` : ''}
      <span class="ico-eaten" data-ico="eaten" data-cid="${p.cid}" title="我吃過" ${Marks.has('eaten', p.cid) ? '' : 'hidden'}>${I.bowl}</span>
      <span class="ico-saved" data-ico="saved" data-cid="${p.cid}" title="已存地圖" ${Marks.has('saved', p.cid) ? '' : 'hidden'}>${I.saved}</span>
    </span>`;
  }
  function linkButtons(p, withShow) {
    return `<a class="btn primary" href="https://maps.google.com/?cid=${p.cid}" target="_blank" rel="noopener">${I.pin}地圖</a>
      <a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener">${I.nav}導航</a>
      <a class="btn save" data-save="${p.cid}" href="https://maps.google.com/?cid=${p.cid}" target="_blank" rel="noopener" title="存到我的 Google 地圖清單">${I.save}存清單</a>
      ${withShow && p.city !== '日本' ? `<button class="btn" type="button" data-show="${p.cid}">${I.map}看位置</button>` : ''}`;
  }
  function lalaTag(p) {
    if (visitedIds.has(p.cid) && state.view === 'wish') return '<span class="tag done">拉拉熊吃過</span>';
    if (!visitedIds.has(p.cid) && wishIds.has(p.cid) && state.view === 'visited') return '<span class="tag">拉拉熊想去</span>';
    return '';
  }
  function postsHtml(p, title) {
    const ps = postsOf(p);
    if (!ps.length) return '';
    return `<div class="posts">
      <div class="posts-h">${I.quote}${title || '拉拉熊在 Threads 說'}</div>
      ${ps.map((x, i) => `<div class="post">
        <span class="when">${fmtDate(x.date)}</span>
        ${x.text ? `<q>${esc(x.text)}</q>` : ''}
        <div class="row">
          <button class="linkbtn" type="button" data-read="${p.cid}" data-i="${i}">預覽文章與照片</button>
          <a class="linkbtn" href="${esc(x.url)}" target="_blank" rel="noopener">Threads 原文 ↗</a>
        </div>
      </div>`).join('')}
    </div>`;
  }
  function rowHtml(p, opts = {}) {
    const attr = opts.pick ? `data-pick="${p.cid}"` : `data-open="${p.cid}"`;
    const cur = state.sel === p.cid ? 'aria-current="true"' : '';
    return `<li>
      <button type="button" class="r" ${attr} ${cur}>
        <span class="name">${esc(p.name)}</span>
        <span class="sub"><span class="tag">${p.cat}</span>${esc(placeOf(p))}${opts.lala ? lalaTag(p) : ''}</span>
        ${iconsHtml(p)}
      </button>
      ${opts.acts ? `<div class="row-acts">${marksHtml(p, true)}<a class="btn primary" href="https://maps.google.com/?cid=${p.cid}" target="_blank" rel="noopener">${I.pin}地圖</a>${p.city !== '日本' ? `<button class="btn" type="button" data-show="${p.cid}">${I.map}看位置</button>` : ''}</div>` : ''}
    </li>`;
  }
  const embedUrl = p => `https://maps.google.com/maps?q=${encodeURIComponent(`${p.name} ${p.addr}`)}&hl=zh-TW&z=16&output=embed`;
  function detailHtml(p, ctx) {
    const lead = ctx === 'side'
      ? `<button class="linkbtn back" type="button" data-deselect>${I.back}回到清單</button>`
      : '';
    return `<div class="detail">
      ${lead}
      <div class="detail-head"><h3>${esc(p.name)}</h3><button class="icon-btn" type="button" ${ctx === 'dlg' ? 'data-close-detail' : 'data-deselect'} aria-label="關閉">×</button></div>
      <div class="meta"><span class="tag">${p.cat}</span>${lalaTag(p)}${postsOf(p).length ? '<span class="tag has-post">有文章</span>' : ''}<span>${esc(placeOf(p))}</span></div>
      <div class="addr">${esc(p.addr)}</div>
      ${marksHtml(p)}
      <div class="gmap"><span class="gmap-hint">Google 地圖載入中…</span><iframe src="${embedUrl(p)}" title="Google 地圖：${esc(p.name)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>
      <div class="actions">${linkButtons(p, ctx === 'dlg')}</div>
      ${postsHtml(p, '拉拉熊的原始評價')}
    </div>`;
  }

  /* ---------- 美食地圖 ---------- */
  let map = null, cluster = null, markers = {}, lastRandom = null;
  function pinSvg(kind) {
    const fill = cssVar(kind === 'visited' ? '--pin-visited' : '--pin-wish') || (kind === 'visited' ? '#41140e' : '#6f8794');
    const inner = kind === 'visited'
      ? '<path d="M11 8v5.5a1.5 1.5 0 0 0 1.5 1.5V22h1v-7a1.5 1.5 0 0 0 1.5-1.5V8M13 8v4M19 8c-1.2 0-2 1.6-2 3.5S17.6 14 18.5 14V22h1V8z" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<path d="M15 21s-4.5-2.8-5.7-5.6c-.9-2 .4-4.3 2.6-4.3 1.3 0 2.2.7 2.8 1.6.6-.9 1.5-1.6 2.8-1.6 2.2 0 3.5 2.3 2.6 4.3C19.5 18.2 15 21 15 21z" fill="#fff"/>';
    return `<svg viewBox="0 0 30 40"><path d="M15 39C15 39 2 23.5 2 14a13 13 0 0 1 26 0c0 9.5-13 25-13 25z" fill="${fill}" stroke="#fff" stroke-width="1.5"/>${inner}</svg>`;
  }
  const pinIcon = (kind, sel) => L.divIcon({ className: 'pin' + (sel ? ' sel' : ''), html: pinSvg(kind), iconSize: [30, 40], iconAnchor: [15, 39] });
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  function buildMap() {
    if (map || !window.L) return;
    map = L.map('map', {
      zoomControl: true, attributionControl: true, preferCanvas: true,
      minZoom: 6.5, maxZoom: 18, zoomSnap: 0.5,
      maxBounds: [[20.5, 117.5], [26.8, 123.5]], maxBoundsViscosity: 0.8,
    });
    map.attributionControl.setPrefix(false).addAttribution('行政區界：內政部國土測繪中心');
    map.fitBounds(TW_BOUNDS);
    const topo = window.TW_TOPO;
    if (topo && window.topojson) {
      const towns = topojson.feature(topo, topo.objects.towns);
      const townStyle = () => ({ color: cssVar('--town-line'), weight: 0.7, fillColor: cssVar('--land'), fillOpacity: 1 });
      const townLayer = L.geoJSON(towns, { style: townStyle, interactive: false }).addTo(map);
      const countyLines = topojson.mesh(topo, topo.objects.counties, (a, b) => a !== b);
      const countyLayer = L.geoJSON(countyLines, { style: () => ({ color: cssVar('--county-line'), weight: 1.2, dashArray: '4 3', fill: false }), interactive: false }).addTo(map);
      const countyLbl = L.layerGroup(), townLbl = L.layerGroup();
      const fixed = { '新北市': [24.93, 121.63], '基隆市': [25.12, 121.72], '臺北市': [25.07, 121.56], '台北市': [25.07, 121.56] };
      topojson.feature(topo, topo.objects.counties).features.forEach(f => {
        const name = f.properties.COUNTYNAME;
        L.marker(fixed[name] || L.geoJSON(f).getBounds().getCenter(), { interactive: false, keyboard: false, icon: L.divIcon({ className: 'area-label', html: name.replace('臺', '台') }) }).addTo(countyLbl);
      });
      towns.features.forEach(f => {
        L.marker(L.geoJSON(f).getBounds().getCenter(), { interactive: false, keyboard: false, icon: L.divIcon({ className: 'area-label town', html: f.properties.TOWNNAME }) }).addTo(townLbl);
      });
      const syncLabels = () => {
        const z = map.getZoom();
        if (z < 8) { map.removeLayer(countyLbl); map.removeLayer(townLbl); }
        else if (z < 11.5) { map.addLayer(countyLbl); map.removeLayer(townLbl); }
        else { map.removeLayer(countyLbl); map.addLayer(townLbl); }
      };
      map.on('zoomend', syncLabels); syncLabels();
      const restyle = () => { townLayer.setStyle(townStyle()); countyLayer.setStyle({ color: cssVar('--county-line') }); };
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', restyle);
      new MutationObserver(restyle).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }
  }

  let fitPending = true;
  function renderMap(items) {
    buildMap();
    if (!map) { $('mapnote').textContent = '地圖載入失敗，請重新整理頁面'; return; }
    if (cluster) map.removeLayer(cluster);
    const kind = state.view;
    cluster = L.markerClusterGroup({
      maxClusterRadius: 44, showCoverageOnHover: false, spiderfyOnMaxZoom: true, removeOutsideVisibleBounds: false, disableClusteringAtZoom: 16,
      iconCreateFunction: c => {
        const n = c.getChildCount(); const s = n < 10 ? 32 : n < 50 ? 38 : 46;
        return L.divIcon({ html: `<div class="cluster ${kind}" style="width:${s}px;height:${s}px">${n}</div>`, className: '', iconSize: [s, s] });
      },
    });
    markers = {};
    const onMap = items.filter(p => p.city !== '日本');
    onMap.forEach(p => {
      const m = L.marker([p.lat, p.lng], { title: p.name, icon: pinIcon(kind, state.sel === p.cid), riseOnHover: true });
      m.on('click', () => select(p.cid, { fly: false }));
      markers[p.cid] = m; cluster.addLayer(m);
    });
    map.addLayer(cluster);
    const away = items.length - onMap.length;
    $('mapnote').textContent = (state.cities.size ? `${[...state.cities].map(shortCity).join('、')}・` : '') + `${onMap.length} 個地點` + (away ? `（另有 ${away} 個在日本）` : '');
    if (state.sel && !items.some(p => p.cid === state.sel)) deselect();
    if (fitPending && state.tab === 'map') fitMap(onMap);
  }
  function fitMap(onMap) {
    fitPending = false;
    setTimeout(() => {
      map.invalidateSize();
      if (!state.cities.size && onMap.length > 3) map.fitBounds(TW_BOUNDS);
      else if (onMap.length) map.fitBounds(L.latLngBounds(onMap.map(p => [p.lat, p.lng])).pad(0.2), { maxZoom: 15 });
      else map.fitBounds(TW_BOUNDS);
    }, 0);
  }
  function renderSide(items) {
    const sorted = [...items].sort((a, b) => ORDER.indexOf(a.cat) - ORDER.indexOf(b.cat) || b.added - a.added);
    $('side-count').innerHTML = `<span>共 ${items.length} 個地點</span><button class="linkbtn" type="button" data-open-save>${I.save}全部收藏到 Google 地圖</button>`;
    $('side-rows').innerHTML = sorted.length ? sorted.map(p => rowHtml(p, { pick: true, lala: true })).join('') : '<li class="empty">找不到符合的店，試試把篩選改回「全部」。</li>';
  }

  function select(cid, { fly = true } = {}) {
    const p = allPlaces.get(cid); if (!p) return;
    if (!markers[cid] && p.city !== '日本') {
      // 這家店不在目前的清單或篩選裡：切到含有它的清單並清除篩選
      if (!list().some(x => x.cid === cid)) state.view = visitedIds.has(cid) ? 'visited' : 'wish';
      state.cats.clear(); state.cities.clear(); state.postOnly = false; state.q = ''; $('q').value = '';
      renderAll();
    }
    const prev = state.sel; state.sel = cid;
    if (prev && markers[prev]) markers[prev].setIcon(pinIcon(state.view, false));
    if (markers[cid]) markers[cid].setIcon(pinIcon(state.view, true));
    $$('#side-rows .r').forEach(r => r.toggleAttribute('aria-current', r.dataset.pick === cid));
    if (mobile()) {
      const sh = $('sheet'); sh.innerHTML = detailHtml(p, 'sheet'); sh.hidden = false; sh.scrollTop = 0;
    } else {
      $('side-detail').innerHTML = detailHtml(p, 'side'); $('side-detail').hidden = false; $('side-list').hidden = true; $('side-detail').scrollTop = 0;
    }
    const m = markers[cid]; if (!m || !map) return;
    const z = fly ? Math.max(map.getZoom(), 16) : map.getZoom();
    // 手機底部面板蓋住下半部：讓圖釘停在可見範圍的中間
    const target = mobile()
      ? map.unproject(map.project(m.getLatLng(), z).add([0, $('sheet').offsetHeight / 2]), z)
      : m.getLatLng();
    const reveal = () => {
      // 兩家店靠很近時可能還在群組裡：把群組展開
      const vp = cluster.getVisibleParent(m);
      if (vp && vp !== m && vp.spiderfy) vp.spiderfy();
    };
    map.once('moveend', reveal);
    map.setView(target, z, { animate: true });
    // 動畫偶爾會卡住（例如分頁在背景）：一秒後還沒到就直接跳過去
    setTimeout(() => {
      if (state.sel !== cid) return;
      if (Math.abs(map.getZoom() - z) > 0.1 || map.getCenter().distanceTo(target) > 30) { map.setView(target, z, { animate: false }); reveal(); }
    }, 1000);
  }
  function deselect() {
    if (state.sel && markers[state.sel]) markers[state.sel].setIcon(pinIcon(state.view, false));
    const was = state.sel; state.sel = null;
    $('sheet').hidden = true; $('sheet').innerHTML = '';
    $('side-detail').hidden = true; $('side-detail').innerHTML = ''; $('side-list').hidden = false;
    $$('#side-rows .r').forEach(r => r.removeAttribute('aria-current'));
    const back = was && $('side-rows').querySelector(`[data-pick="${was}"]`);
    if (back && !mobile()) back.focus({ preventScroll: false });
  }
  function randomPick() {
    if (state.tab !== 'map') location.hash = '#map';
    const pool = filtered().filter(p => p.city !== '日本' && p.cid !== lastRandom);
    if (!pool.length) { toast('目前的篩選沒有店可以推薦，試試放寬條件。'); return; }
    const p = pool[Math.floor(Math.random() * pool.length)];
    lastRandom = p.cid;
    select(p.cid);
    toast(`今天吃 <b>${esc(p.name)}</b> 如何？`, '換一家', randomPick);
  }

  /* ---------- 美食清單 ---------- */
  function card(p) {
    const hasPost = postsOf(p).length ? '<span class="tag has-post">有文章</span>' : '';
    return `<article class="card">
      <div class="head"><h4><button type="button" data-open="${p.cid}">${esc(p.name)}</button></h4>${state.view === 'wish' ? I.heart : ''}</div>
      <div class="meta">${state.sort === 'new' ? `<span class="tag">${p.cat}</span>` : ''}${lalaTag(p)}${hasPost}<span>${esc(placeOf(p))}</span></div>
      <div class="addr">${esc(p.addr)}</div>
      ${marksHtml(p)}
      ${postsHtml(p)}
      <div class="actions">${linkButtons(p, true)}</div>
    </article>`;
  }
  function renderList(items) {
    $('total').textContent = `共 ${items.length} 個地點`;
    $$('[data-layout]').forEach(b => b.setAttribute('aria-pressed', b.dataset.layout === state.layout));
    $('sort').value = state.sort;
    const out = $('results');
    out.className = `layout-${state.layout}${state.sort === 'cat' ? ' grouped' : ''}`;
    if (!items.length) { out.innerHTML = '<div class="empty">找不到符合的店。試試其他關鍵字，或把地區、類型改回「全部」。</div>'; return; }
    const body = group => state.layout === 'rows'
      ? `<div class="rows-box"><ul class="rows wide">${group.map(p => rowHtml(p, { acts: true, lala: true })).join('')}</ul></div>`
      : `<div class="grid">${group.map(card).join('')}</div>`;
    if (state.sort === 'new') { out.innerHTML = body([...items].sort((a, b) => b.added - a.added)); return; }
    out.innerHTML = ORDER.filter(c => items.some(p => p.cat === c)).map(c => {
      const group = items.filter(p => p.cat === c).sort((a, b) => b.added - a.added);
      return `<section class="section"><h3 class="sec"><span class="dot"></span>${c}<span class="c">${group.length} 家</span>${state.layout === 'cards' && group.length > 1 ? '<span class="swipe-hint">左右滑動 →</span>' : ''}</h3>${body(group)}</section>`;
    }).join('');
  }
  function openDetail(cid) {
    const p = allPlaces.get(cid); if (!p) return;
    if (state.tab === 'map') { select(cid); return; }
    $('detail-dlg-body').innerHTML = detailHtml(p, 'dlg');
    lastFocus = document.activeElement;
    $('detail-dlg').showModal();
    $('detail-dlg-body').scrollTop = 0;
  }

  /* ---------- 我的紀錄 ---------- */
  function renderAuth() {
    const el = $('auth');
    if (!CLOUD) { el.innerHTML = ''; return; }
    if (!Marks.ready) { el.innerHTML = ''; return; }
    const u = Marks.user;
    el.innerHTML = u
      ? `<a class="me-btn" href="#me" title="${esc(u.name || '我的紀錄')}">${avatar(u)}<span>${esc((u.name || '').split(' ')[0] || '我的紀錄')}</span></a>`
      : `<button class="gbtn" type="button" data-signin>${I.g}<span>用 Google 登入</span></button>`;
  }
  function avatar(u, cls = '') {
    return u && u.photo ? `<img class="avatar ${cls}" src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">`
      : `<span class="avatar ${cls}">${esc(((u && u.name) || '我').slice(0, 1))}</span>`;
  }
  function renderBadge() {
    const n = Marks.count('eaten') + Marks.count('saved');
    $('me-badge').hidden = !n; $('me-badge').textContent = n > 99 ? '99+' : n;
  }
  function renderMe() {
    const u = Marks.user;
    let hero;
    if (CLOUD && u) {
      hero = `<div class="me-hero">${avatar(u)}<div><h2>${esc(u.name || '我的紀錄')}</h2><p>已登入${u.email ? `（${esc(u.email)}）` : ''}，標記會同步到你的 Google 帳號。</p></div>
        <div class="hero-acts"><button class="pill" type="button" data-signout>登出</button></div></div>`;
    } else if (CLOUD) {
      hero = `<div class="me-hero"><span class="avatar">${I.bowl}</span><div><h2>我的紀錄</h2><p>用 Google 登入，就能在手機和電腦之間同步你標記的店。沒登入時，標記會先存在這台裝置。</p></div>
        <div class="hero-acts"><button class="gbtn" type="button" data-signin>${I.g}<span>用 Google 登入</span></button></div></div>`;
    } else {
      hero = `<div class="me-hero"><span class="avatar">${I.bowl}</span><div><h2>我的紀錄</h2><p>在店家點「我吃過」或「存了嗎？」，就會記在這裡。</p></div></div>
        <p class="note">Google 登入還沒開放，目前你的標記存在這台裝置的瀏覽器裡；換手機或清除瀏覽資料就會不見。</p>`;
    }
    const lalaVisited = D.visited.filter(p => Marks.has('eaten', p.cid)).length;
    const stats = `<div class="stats">
      <div class="stat eaten"><b>${Marks.count('eaten')}</b><span>我吃過</span></div>
      <div class="stat saved"><b>${Marks.count('saved')}</b><span>已存到地圖</span></div>
      <div class="stat"><b>${lalaVisited}<small style="font-size:14px;color:var(--ink-2);font-weight:500"> / ${D.visited.length}</small></b><span>拉拉熊吃過的店</span></div>
    </div>`;
    const kind = state.meTab;
    const bag = Marks.data[kind] || {};
    const items = Object.keys(bag).filter(c => allPlaces.has(c)).sort((a, b) => bag[b] - bag[a]).map(c => allPlaces.get(c));
    const seg = `<div class="seg" role="group" aria-label="紀錄類型">
      <button type="button" data-metab="eaten" aria-pressed="${kind === 'eaten'}">${I.bowl}我吃過<span class="n">${Marks.count('eaten')}</span></button>
      <button type="button" data-metab="saved" aria-pressed="${kind === 'saved'}">${I.saved}已存地圖<span class="n">${Marks.count('saved')}</span></button>
    </div>`;
    const body = items.length
      ? `<div class="rows-box"><ul class="rows wide">${items.map(p => rowHtml(p, { acts: true, lala: false })).join('')}</ul></div>`
      : `<div class="empty me-empty"><div>${kind === 'eaten' ? '還沒有標記吃過的店。' : '還沒有標記存到地圖的店。'}<br>在地圖或清單裡打開店家，點「${kind === 'eaten' ? '我吃過？' : '存了嗎？'}」就會出現在這裡。</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><a class="pill" href="#map">去美食地圖</a><a class="pill" href="#list">去美食清單</a></div></div>`;
    $('me').innerHTML = hero + stats + `<div class="me-tabs">${seg}</div>` + body;
  }

  // 標記改變時，只更新畫面上相關的按鈕與圖示
  function refreshMarks(cid) {
    $$(`[data-mark][data-cid="${cid}"]`).forEach(b => {
      const k = b.dataset.mark, on = Marks.has(k, cid);
      b.setAttribute('aria-pressed', on);
      const small = !!b.closest('.row-acts');
      b.innerHTML = k === 'eaten'
        ? `${I.bowl}<span>${on ? '我吃過' : (small ? '吃過' : '我吃過？')}</span>`
        : `${on ? I.saved : I.save}<span>${on ? '已存地圖' : '存了嗎？'}</span>`;
    });
    $$(`[data-ico][data-cid="${cid}"]`).forEach(i => { i.hidden = !Marks.has(i.dataset.ico, cid); });
    renderBadge();
    if (state.tab === 'me') renderMe();
  }
  function refreshAllMarks() { allPlaces.forEach((_, cid) => { if (document.querySelector(`[data-cid="${cid}"]`)) refreshMarks(cid); }); renderBadge(); }

  /* ---------- 全部收藏到 Google 地圖 ----------
     Google 沒有開放把地點寫進使用者清單的 API，所以提供兩種一次收藏的方式：
     1. 追蹤拉拉熊的整份清單（之後新增的店會同步）
     2. 下載目前篩選結果的 KML，匯入「Google 我的地圖」變成自己的地圖 */
  const listLabel = () => state.view === 'visited' ? '已去過' : '愛心清單';
  function filterSummary() {
    const parts = [];
    if (state.cities.size) parts.push([...state.cities].map(shortCity).join('、'));
    if (state.cats.size) parts.push([...state.cats].join('、'));
    if (state.postOnly) parts.push('有拉拉熊文章');
    if (state.q) parts.push(`搜尋「${state.q}」`);
    return parts.join('／');
  }
  function openSave() {
    const items = filtered();
    const n = items.length, fs = filterSummary();
    const unsaved = items.filter(p => !Marks.has('saved', p.cid)).length;
    $('save-dlg-body').innerHTML = `
      <p class="save-lead">Google 地圖不讓網站直接替你加入收藏，下面兩種方式都只要點一下：</p>
      <section class="save-opt">
        <h4><span class="num">1</span>追蹤拉拉熊的「${listLabel()}」<span class="tag">推薦</span></h4>
        <p>整份清單會出現在 Google 地圖 app 的「已儲存」裡，他之後新增的店也會自動同步。（網站另外補充的店不在他的清單裡，要用下面的方式 2。）</p>
        <a class="pill pill-on" href="${SHARE_LINKS[state.view]}" target="_blank" rel="noopener" data-follow>${I.save}打開清單，按「追蹤」</a>
      </section>
      <section class="save-opt">
        <h4><span class="num">2</span>把 ${n} 家匯入成我自己的地圖</h4>
        <p>下載${fs ? `目前篩選（${esc(fs)}）的` : '這份清單的'} ${n} 家（KML 檔），匯入「Google 我的地圖」。每家店會附上 Google 地圖連結和拉拉熊的 Threads 文章。可以自己刪改，但不會自動同步。</p>
        <button class="pill" type="button" data-kml ${n ? '' : 'disabled'}>${I.dl}下載 ${n} 家（KML）</button>
        <ol class="steps">
          <li>打開 <a href="https://www.google.com/maps/d/" target="_blank" rel="noopener">Google 我的地圖</a>，按「建立新地圖」</li>
          <li>在左邊的圖層按「匯入」，選剛剛下載的檔案</li>
          <li>之後在 Google 地圖 app 的「已儲存 → 地圖」就看得到</li>
        </ol>
      </section>
      ${unsaved ? `<div class="save-foot"><span>收藏好了？在「我的紀錄」一次標記這 ${n} 家為已存。</span><button class="linkbtn" type="button" data-mark-all-saved>全部標記已存（${unsaved} 家）</button></div>` : ''}`;
    lastFocus = document.activeElement;
    $('save-dlg').showModal();
  }
  const xml = s => String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
  function downloadKml() {
    const items = filtered();
    if (!items.length) return;
    const title = `跟拉拉熊一起吃・${listLabel()}` + (filterSummary() ? `（${filterSummary()}）` : '');
    const place = p => {
      const lines = [`${p.cat}・${placeOf(p)}`, p.addr, `Google 地圖：https://maps.google.com/?cid=${p.cid}`];
      postsOf(p).forEach(x => lines.push(`拉拉熊 ${fmtDate(x.date)}：${x.url}`));
      return `<Placemark><name>${xml(p.name)}</name><description>${xml(lines.join('\n'))}</description>` +
        `<Point><coordinates>${p.lng},${p.lat},0</coordinates></Point></Placemark>`;
    };
    const folders = ORDER.filter(c => items.some(p => p.cat === c))
      .map(c => `<Folder><name>${xml(c)}</name>${items.filter(p => p.cat === c).map(place).join('')}</Folder>`).join('');
    const kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xml(title)}</name>` +
      `<description>${xml(`資料來自拉拉熊的 Google 地圖清單（${D.updated || ''}）與 Threads。https://2xin15.github.io/lala-food/`)}</description>${folders}</Document></kml>\n`;
    const url = URL.createObjectURL(new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' }));
    const a = document.createElement('a');
    a.href = url; a.download = `拉拉熊-${listLabel()}-${items.length}家.kml`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(`已下載 ${items.length} 家。接著到 <b>Google 我的地圖</b> 建立新地圖並匯入這個檔案。`);
  }
  function markAllSaved() {
    const items = filtered().filter(p => !Marks.has('saved', p.cid));
    if (!items.length) return;
    const bag = Marks.data.saved || (Marks.data.saved = {});
    const now = Date.now();
    items.forEach((p, i) => { bag[p.cid] = now + i; });
    Marks.persist();
    items.forEach(p => refreshMarks(p.cid));
    $('save-dlg').close();
    toast(`已把 ${items.length} 家標記為已存，可以在「我的紀錄」查看。`);
  }

  /* ---------- Threads 文章預覽 ---------- */
  let lastFocus = null;
  function openReader(cid, i) {
    const p = allPlaces.get(cid), ps = POSTS[cid]; if (!p || !ps) return;
    const dlg = $('reader');
    const show = k => {
      const x = ps[k];
      $('reader-body').innerHTML = `<iframe src="${esc(x.url)}/embed" title="拉拉熊的 Threads 文章" referrerpolicy="no-referrer"></iframe>`;
      $('reader-open').href = x.url;
      $('reader-date').textContent = `發文日期 ${fmtDate(x.date)}`;
      $$('#reader-nav .chip').forEach((c, j) => c.setAttribute('aria-pressed', j === k));
    };
    $('reader-title').textContent = p.name;
    $('reader-nav').innerHTML = ps.length > 1 ? ps.map((x, k) => `<button class="chip" type="button" data-k="${k}">${fmtDate(x.date)}</button>`).join('') : '';
    $('reader-nav').onclick = e => { const b = e.target.closest('[data-k]'); if (b) show(+b.dataset.k); };
    i = Math.min(i, ps.length - 1);
    if (typeof dlg.showModal !== 'function') { window.open(ps[i].url, '_blank', 'noopener'); return; }
    show(i);
    if (!$('detail-dlg').open) lastFocus = document.activeElement;
    dlg.showModal();
  }
  $('reader-close').addEventListener('click', () => $('reader').close());
  $('reader').addEventListener('close', () => { $('reader-body').innerHTML = ''; });

  /* ---------- 提示 ---------- */
  let toastTimer = null;
  function toast(html, btnLabel, onBtn) {
    const t = $('toast');
    t.innerHTML = `<span>${html}</span>${btnLabel ? `<button type="button">${esc(btnLabel)}</button>` : ''}`;
    if (btnLabel) t.querySelector('button').onclick = () => { t.hidden = true; onBtn(); };
    t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, btnLabel ? 9000 : 6000);
  }

  /* ---------- 分頁與整體繪製 ---------- */
  function renderAll() {
    renderSeg(); renderFilters();
    const items = filtered();
    if (map || state.tab === 'map') renderMap(items);
    renderSide(items);
    renderList(items);
  }
  function setTab(tab) {
    if (!['map', 'list', 'me'].includes(tab)) tab = 'map';
    state.tab = tab;
    ['map', 'list', 'me'].forEach(t => { $('view-' + t).hidden = t !== tab; });
    $$('#nav a').forEach(a => { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    placeFilters();
    if (tab === 'map') {
      if (!map) { fitPending = true; renderMap(filtered()); }
      else if (fitPending) fitMap(filtered().filter(p => p.city !== '日本'));
      setTimeout(() => map && map.invalidateSize(), 0);
    }
    if (tab === 'me') renderMe();
    document.title = { map: '美食地圖', list: '美食清單', me: '我的紀錄' }[tab] + '・跟拉拉熊一起吃';
  }
  function route() {
    const tab = (location.hash || '#map').slice(1).split('/')[0];
    $('toast').hidden = true;
    setTab(tab);
    window.scrollTo({ top: 0 });
  }

  /* ---------- 事件 ---------- */
  const onFilterChange = () => { fitPending = true; renderAll(); };
  $('chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { toggleIn(state.cats, b.dataset.cat); onFilterChange(); } });
  $('cities').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { toggleIn(state.cities, b.dataset.city); onFilterChange(); } });
  $('extras').addEventListener('click', e => { if (e.target.closest('[data-post]')) { state.postOnly = !state.postOnly; onFilterChange(); } });
  let qTimer = null;
  $('q').addEventListener('input', e => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value.trim(); onFilterChange(); }, 150); });
  $('sort').addEventListener('change', e => { state.sort = e.target.value; store('lala-sort', state.sort); renderList(filtered()); });

  document.addEventListener('click', e => {
    const t = e.target;
    let el;
    if ((el = t.closest('[data-src]'))) {
      if (state.view !== el.dataset.src) { state.view = el.dataset.src; store('lala-view', state.view); state.cats.clear(); state.cities.clear(); deselect(); fitPending = true; renderAll(); }
      return;
    }
    if ((el = t.closest('[data-mark]'))) {
      const cid = el.dataset.cid, kind = el.dataset.mark;
      const on = Marks.toggle(kind, cid);
      if (on && CLOUD && !Marks.user && !sessionStorage.getItem('lala-hint')) {
        try { sessionStorage.setItem('lala-hint', '1'); } catch (err) {}
        toast('已先記在這台裝置。登入後可以在手機、電腦同步。', '用 Google 登入', signIn);
      }
      return;
    }
    if ((el = t.closest('[data-pick]'))) { select(el.dataset.pick); return; }
    if ((el = t.closest('[data-open]'))) { openDetail(el.dataset.open); return; }
    if ((el = t.closest('[data-show]'))) {
      const cid = el.dataset.show;
      if ($('detail-dlg').open) $('detail-dlg').close();
      if (state.tab !== 'map') { location.hash = '#map'; setTab('map'); }
      setTimeout(() => select(cid), 60);
      return;
    }
    if (t.closest('[data-deselect]')) { deselect(); return; }
    if (t.closest('[data-close-detail]')) { $('detail-dlg').close(); return; }
    if ((el = t.closest('[data-read]'))) { openReader(el.dataset.read, +el.dataset.i || 0); return; }
    if (t.closest('[data-random]')) { randomPick(); return; }
    if (t.closest('[data-open-filters]')) { placeFilters(); $('filter-dlg').showModal(); return; }
    if (t.closest('[data-clear-filters]')) { state.cats.clear(); state.cities.clear(); state.postOnly = false; state.q = ''; $('q').value = ''; onFilterChange(); return; }
    if (t.closest('#filter-dlg [data-close]')) { $('filter-dlg').close(); return; }
    if (t.closest('#save-dlg [data-close]')) { $('save-dlg').close(); return; }
    if (t.closest('[data-open-save]')) { openSave(); return; }
    if ((el = t.closest('[data-follow]'))) { toast('已打開 Google 地圖清單。點 <b>「追蹤」</b>，整份清單就會出現在你的「已儲存」裡。'); return; }
    if (t.closest('[data-kml]')) { downloadKml(); return; }
    if (t.closest('[data-mark-all-saved]')) { markAllSaved(); return; }
    if ((el = t.closest('[data-layout]'))) { state.layout = el.dataset.layout; store('lala-layout', state.layout); renderList(filtered()); return; }
    if ((el = t.closest('[data-metab]'))) { state.meTab = el.dataset.metab; renderMe(); return; }
    if (t.closest('[data-signin]')) { signIn(); return; }
    if (t.closest('[data-signout]')) { window.LalaCloud && window.LalaCloud.signOut(); return; }
    if ((el = t.closest('[data-save]'))) {
      const cid = el.dataset.save;
      if (!Marks.has('saved', cid)) toast('已在 Google 地圖打開這家店。按 <b>「儲存」</b> 存好後，回來標記一下：', '標記為已存', () => Marks.set('saved', cid, true));
      return;
    }
  });
  // 點對話框外圍就關閉
  ['filter-dlg', 'save-dlg', 'detail-dlg', 'reader'].forEach(id => $(id).addEventListener('click', e => { if (e.target === $(id)) $(id).close(); }));
  $('detail-dlg').addEventListener('close', () => { $('detail-dlg-body').innerHTML = ''; if (lastFocus && document.contains(lastFocus)) lastFocus.focus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.sel && !document.querySelector('dialog[open]')) deselect(); });

  let signingIn = false;
  function signIn() {
    if (!window.LalaCloud) { toast('Google 登入正在載入，請稍候再試。'); return; }
    if (signingIn) return; // 已經開了登入視窗，避免連點把它取消
    signingIn = true;
    window.LalaCloud.signIn().catch(err => {
      if (err && ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(err.code)) return;
      console.error(err); toast('登入沒有成功，請再試一次。');
    }).finally(() => { signingIn = false; });
  }

  // 頁首高度（手機底部分頁列在 CSS 處理）
  const syncTop = () => document.documentElement.style.setProperty('--top-h', $('top').offsetHeight + 'px');
  new ResizeObserver(syncTop).observe($('top')); syncTop();
  matchMedia('(max-width: 760px)').addEventListener('change', () => {
    placeFilters();
    if (state.sel) { const cid = state.sel; deselect(); select(cid, { fly: false }); }
    setTimeout(() => map && map.invalidateSize(), 50);
  });
  window.addEventListener('hashchange', route);

  if (D.updated) $('sub').textContent += `・更新於 ${D.updated}`;
  renderAuth(); renderBadge();
  renderAll();
  route();
})();
