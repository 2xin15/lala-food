// 從 Google 地圖清單抓最新資料，寫入 data.js
// 用法：node update.mjs
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';

const LISTS = {
  visited: 'sS_9aKBvCYUpElpIW1_DqweYAWsM4A', // 跟拉拉熊一起吃（他說過好吃的 = 已去過）
  wish: 'zx9JfvSi_pqYNQ6jvVv_ExkUjHRkgQ',    // Favorite places（愛心清單）
};

// 依店名關鍵字自動分類；順序重要，先比對到的先用
const RULES = [
  ['景點・生活', /公園|官邸|移民署|YouBike|捷運|停車場|三温暖|[Hh]air|凱基|百貨|OUTLET|Garden City|夜市$|神農街|文旅|新村|故事館|宿舍|園邸|溫泉|中藥|廣場|華固|聚落|Village Museum/],
  ['拉麵', /拉麵|拉面|ラーメン|らーめん|白湯|麵坊|柑橘/],
  ['燒烤・鍋物', /燒烤|燒肉|壽喜燒|Mo-Mo|火鍋|涮涮|湯爐|羊肉爐|炒香鍋|湯海|全牛料理/],
  ['牛肉麵・牛肉湯', /牛肉麵|牛肉湯|溫體牛|牛肉店|牛霸|江牛|牛店/],
  ['甜點・冰品', /冰|豆花|豆家|芋圓|甜品|湯圓|元宵|麻糬|蛋糕|御菓子|雪腐|仙草|拔絲|Pâtisserie|糕餅|芋香園|蒟蒻|木瓜牛奶|牛奶大王|水果/],
  ['飲料・咖啡・酒', /咖啡|Coffee|Café|Cafe|珈琲|茶飲|紅茶|茶莊|茶水舖|茶道|不夜侯|迷客夏|泰讚|KAFFA|甘蔗|Starbucks|CHADWANG|奉茶|Mikkeller|啤酒|Beer|BAR|啜飲室|沙丘/],
  ['早午餐・漢堡・麵包', /漢堡|[Bb]urger|BURGER|早午餐|早餐|BREAKFAST|麵包|bread|烘焙|libreadry|Cornerstone|飯糰|豆漿|蛋餅|DOUBLE SINGLE|BREW|Popeyes|炸雞-高雄|Sunday Morning/],
  ['異國料理', /咖喱|[Cc]urry|韓|泰|印度|滇|米干|義大利|pasta|kitchen|廣島燒|茶餐廳|燒臘|川渝|港|牛排|旨燕|時時香|瓦城|MUJI/],
  ['麵食・水餃', /麵|餃|餛飩|餡餅|生煎包|小籠包|刀削|米苔目|麵線|大麵炒/],
  ['台式小吃・飯', /飯|米糕|鴨|鵝|豬腳|排骨|雞|焿|滷|魯|小吃|香腸|食堂|館|羊肉|豆腐|炒|小馆|客家|自己人|大姐|潤餅|蘿蔔絲餅|酥湯|豬|香滿園|眷村味|五燈獎|麻辣/],
];
// 規則猜不準的店，手動指定分類（店名包含左邊文字就套用）
const OVERRIDES = {
  '下港吔羊肉': '台式小吃・飯',
  '雙月食品社': '台式小吃・飯',
  '鮮茶道': '飲料・咖啡・酒',
  '林振櫂燒麻糬': '甜點・冰品',
  '穗月': '早午餐・漢堡・麵包',
  '天蠍座燒烤': '燒烤・鍋物',
  '牛大福': '燒烤・鍋物',
  '初炸小食店': '台式小吃・飯',
  '禾豐美食': '台式小吃・飯',
  '老眷村之張吳紀': '台式小吃・飯',
  '亞米亞米': '台式小吃・飯',
  '鼎泰豐': '麵食・水餃',
  '澳華燒鵝': '台式小吃・飯',
  '眷村口米干': '台式小吃・飯',
};

const CITIES = ['臺北市', '新北市', '基隆市', '桃園市', '新竹市', '臺中市', '嘉義市', '臺南市', '高雄市', '屏東縣', '金門縣'];

function categorize(name) {
  for (const [k, c] of Object.entries(OVERRIDES)) if (name.includes(k)) return c;
  for (const [c, re] of RULES) if (re.test(name)) return c;
  return '其他美食';
}
function cityOf(addr, lat) {
  if (/日本|Japan|Kyoto/.test(addr) || lat > 30) return '日本';
  const c = CITIES.find((c) => addr.includes(c));
  return c ? c.replace('臺', '台') : '其他';
}
function cleanAddr(a) {
  return a.replace(/^\d{3,6}/, '').replace(/(臺|台)(北|中|南)市/, '$1$2市');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 抓一份 Google 地圖清單；失敗會重試 3 次，格式不對就整個停下（不寫入壞資料）
async function fetchList(id) {
  const url = `https://www.google.com/maps/preview/entitylist/getlist?authuser=0&hl=zh-TW&gl=tw&pb=!1m4!1s${id}!2e1!3m1!1e1!2e2!3e2!4i500!16b1`;
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'zh-TW,zh;q=0.9' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const L = JSON.parse(text.slice(text.indexOf('\n') + 1))[0];
      if (!L || !Array.isArray(L[8])) throw new Error('回傳的清單格式不對');
      return parseList(L[8]);
    } catch (err) {
      lastErr = err;
      console.warn(`清單 ${id} 第 ${attempt} 次抓取失敗：${err.message}`);
      if (attempt < 3) await sleep(5000 * attempt);
    }
  }
  throw new Error(`抓不到清單 ${id}：${lastErr.message}`);
}

function parseList(entries) {
  return entries.filter((e) => e && e[1] && e[1][6] && e[1][5]).map((e) => {
    let cid = BigInt(e[1][6][1]);
    if (cid < 0n) cid += 2n ** 64n;
    const addr = e[1][4] || e[1][2] || '';
    const lat = e[1][5][2], lng = e[1][5][3];
    return {
      name: e[2],
      note: e[3] || '',
      addr: cleanAddr(addr),
      city: cityOf(addr, lat),
      cat: categorize(e[2]),
      lat: +lat.toFixed(6),
      lng: +lng.toFixed(6),
      cid: cid.toString(),
      added: e[9] ? e[9][0] : 0,
    };
  });
}

// notes.json：手動補充的品項／Threads 連結，key 是店名（或店名的一部分）
const notes = existsSync('notes.json') ? JSON.parse(readFileSync('notes.json', 'utf8')) : {};
function attachNotes(p) {
  for (const [k, v] of Object.entries(notes)) {
    if (k.startsWith('_')) continue;
    if (p.name.includes(k)) Object.assign(p, v);
  }
  return p;
}

const visited = (await fetchList(LISTS.visited)).map(attachNotes);
const wish = (await fetchList(LISTS.wish)).map(attachNotes);

// extra.json：手動補進「已去過」的地點（Threads 有吃過紀錄，但不在他的已去過清單）
const extra = existsSync('extra.json') ? JSON.parse(readFileSync('extra.json', 'utf8')) : {};
// visited_remove：他清單裡有、但其實沒吃過的地點，從已去過拿掉
for (const cid of Object.keys(extra.visited_remove || {})) {
  const i = visited.findIndex((p) => p.cid === cid);
  if (i >= 0) visited.splice(i, 1);
}
const visitedIds = new Set(visited.map((p) => p.cid));
for (const cid of Object.keys(extra.visited_from_wish || {})) {
  const p = wish.find((w) => w.cid === cid);
  if (p && !visitedIds.has(cid)) { visited.push({ ...p }); visitedIds.add(cid); }
}
for (const e of extra.visited_add || []) {
  if (visitedIds.has(e.cid)) continue;
  visited.push(attachNotes({
    name: e.name, note: e.note || '', addr: cleanAddr(e.addr), city: cityOf(e.addr, e.lat),
    cat: e.cat || categorize(e.name), lat: +e.lat.toFixed(6), lng: +e.lng.toFixed(6), cid: e.cid, added: 0,
  }));
  visitedIds.add(e.cid);
}
// ---------- 跟上一版比較 ----------
const old = existsSync('data.js')
  ? JSON.parse(readFileSync('data.js', 'utf8').replace(/^window\.LALA_DATA\s*=\s*/, '').replace(/;\s*$/, ''))
  : null;

// 安全檢查：數量一次少超過三成，多半是抓取出問題，不要用壞資料蓋掉網站（FORCE=1 可略過）
if (old && !process.env.FORCE) {
  for (const [label, now, before] of [['已去過', visited.length, old.visited.length], ['愛心清單', wish.length, old.wish.length]]) {
    if (before >= 10 && now < before * 0.7) {
      throw new Error(`${label}從 ${before} 筆掉到 ${now} 筆，疑似抓取失敗，這次不更新。確定是真的變少，請用 FORCE=1 重跑。`);
    }
  }
}

const body = { lists: LISTS, visited, wish };
const sameAsOld = old && JSON.stringify({ lists: old.lists, visited: old.visited, wish: old.wish }) === JSON.stringify(body);

const diff = (label, now, before) => {
  const b = new Map((before || []).map((p) => [p.cid, p])), n = new Map(now.map((p) => [p.cid, p]));
  const added = now.filter((p) => !b.has(p.cid)).map((p) => p.name);
  const removed = (before || []).filter((p) => !n.has(p.cid)).map((p) => p.name);
  return [`**${label}**：${now.length} 筆` + (old ? `（新增 ${added.length}、移除 ${removed.length}）` : ''),
    ...added.map((x) => `- ＋ ${x}`), ...removed.map((x) => `- － ${x}`)];
};
const report = [
  sameAsOld ? '資料沒有變動，不更新 data.js。' : '資料有變動，已更新 data.js。',
  '', ...diff('已去過', visited, old && old.visited), '', ...diff('愛心清單', wish, old && old.wish),
];
const others = [...visited, ...wish].filter((p) => p.cat === '其他美食').map((p) => p.name);
if (others.length) report.push('', `其他美食（可在 OVERRIDES 手動分類）：${[...new Set(others)].join('、')}`);

if (!sameAsOld) {
  const data = { updated: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' }), ...body };
  writeFileSync('data.js', 'window.LALA_DATA = ' + JSON.stringify(data) + ';\n');
}
console.log(report.join('\n'));
// 在 GitHub Actions 的執行頁面顯示摘要
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report.join('\n') + '\n');
