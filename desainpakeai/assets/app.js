/* ==========================================================================
   IUL FnB — Data tiruan & util bersama App Kasir & Pemilik (prototipe)
   Struktur data mengikuti skema PRD §6 (users, tables, menu_categories,
   menus, ingredients, recipe_items, orders, order_items, settings).
   ========================================================================== */

/* ---------- Util ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const rp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const rpShort = n => n >= 1e6 ? 'Rp ' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt'
  : n >= 1e3 ? 'Rp ' + Math.round(n / 1e3) + ' rb' : rp(n);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const hhmm = d => new Date(d).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
const tgl = (d, opt = { day:'numeric', month:'short', year:'numeric' }) => new Date(d).toLocaleDateString('id-ID', opt);
const tglPanjang = d => new Date(d).toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
const minsSince = d => Math.max(0, Math.floor((Date.now() - new Date(d)) / 60000));
const ago = d => { const m = minsSince(d); return m < 1 ? 'baru saja' : m < 60 ? m + ' mnt lalu' : m < 1440 ? Math.floor(m / 60) + ' jam lalu' : Math.floor(m / 1440) + ' hari lalu'; };
const initials = name => name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const sum = (arr, f = x => x) => arr.reduce((a, x) => a + f(x), 0);

/** Format jumlah bahan: 1850 gram → "1,85 kg", 4200 ml → "4,2 L" */
function fmtQty(q, unit) {
  const n = v => v.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  if (unit === 'gram' && Math.abs(q) >= 1000) return n(q / 1000) + ' kg';
  if (unit === 'ml' && Math.abs(q) >= 1000) return n(q / 1000) + ' L';
  return n(q) + ' ' + ({ gram:'g', ml:'ml', pcs:'pcs', botol:'botol' }[unit] || unit);
}

/** RNG deterministik (mulberry32) supaya data tiruan konsisten tiap muat ulang */
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- Penyimpanan lokal (aman bila localStorage diblokir) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const KEYS = { role:'iulfnb:role', live:'iulfnb:orders-live', beat:'iulfnb:kasir-beat', seq:'iulfnb:seq' };
let _seqMem = 26;
/** Nomor pesanan berurutan, dipakai bersama halaman pelanggan & kasir */
function nextOrderCode() {
  const n = Math.max(store.get(KEYS.seq, 26), _seqMem) + 1;
  _seqMem = n; store.set(KEYS.seq, n);
  return 'A-' + String(n).padStart(3, '0');
}

/* ---------- Data: pengaturan kafe ---------- */
const SETTINGS = {
  cafe_name: 'Kedai Senja',
  address: 'Jl. Kaliurang Km 5, Yogyakarta',
  phone: '0812-2700-1234',
  open_hour: '08:00',
  close_hour: '22:00',
  tax_percent: 10,
  service_percent: 0,
  receipt: {
    show_logo: true, show_address: true, show_table: true, show_cashier: true, show_notes: true,
    header: '',
    footer: 'Terima kasih, sampai jumpa lagi!',
  },
};

/* ---------- Data: menu ---------- */
const CATEGORIES = [
  { id:'makanan', name:'Makanan',           sort_order:1, tile:'#FCE6D4' },
  { id:'minuman', name:'Minuman',           sort_order:2, tile:'#E2EEDD' },
  { id:'lainnya', name:'Camilan & Lainnya', sort_order:3, tile:'#F7E9BE' },
];
const MENUS = [
  { id:'m1', category_id:'makanan', name:'Nasi Goreng Kampung',        price:32000, image_url:'🍳', is_available:true,  tags:['Terlaris'], desc:'Nasi goreng bumbu terasi, telur ceplok, ayam suwir, dan kerupuk udang.' },
  { id:'m2', category_id:'makanan', name:'Ayam Geprek Sambal Matah',   price:35000, image_url:'🍗', is_available:true,  tags:['Pedas'],    desc:'Ayam krispi digeprek dengan sambal matah segar dan nasi hangat.' },
  { id:'m3', category_id:'makanan', name:'Mie Goreng Jawa',            price:30000, image_url:'🍜', is_available:true,  tags:[],           desc:'Mie kuning dimasak di atas arang dengan sayur, telur, dan bawang goreng.' },
  { id:'m4', category_id:'makanan', name:'Rice Bowl Chicken Teriyaki', price:36000, image_url:'🍱', is_available:true,  tags:['Baru'],     desc:'Potongan ayam saus teriyaki, salad kol, wijen sangrai, dan nasi pulen.' },
  { id:'m5', category_id:'makanan', name:'Nasi Ayam Bakar Madu',       price:38000, image_url:'🍖', is_available:false, tags:[],           desc:'Ayam bakar olesan madu, lalapan segar, dan sambal bawang.' },
  { id:'d1', category_id:'minuman', name:'Kopi Susu Gula Aren',        price:22000, image_url:'☕', is_available:true,  tags:['Terlaris'], desc:'Espresso, susu segar, dan gula aren asli. Tersedia panas atau dingin.' },
  { id:'d2', category_id:'minuman', name:'Es Americano',               price:20000, image_url:'🧊', is_available:true,  tags:[],           desc:'Double shot espresso dengan air dingin. Ringan, bersih, tanpa gula.' },
  { id:'d3', category_id:'minuman', name:'Matcha Latte',               price:28000, image_url:'🍵', is_available:true,  tags:['Baru'],     desc:'Matcha Jepang premium dengan susu segar yang lembut.' },
  { id:'d4', category_id:'minuman', name:'Es Teh Manis',               price:10000, image_url:'🥤', is_available:true,  tags:[],           desc:'Teh melati diseduh segar setiap pagi.' },
  { id:'d5', category_id:'minuman', name:'Lemon Tea',                  price:15000, image_url:'🍋', is_available:true,  tags:[],           desc:'Teh hitam dengan perasan lemon segar dan sedikit madu.' },
  { id:'d6', category_id:'minuman', name:'Jus Alpukat',                price:25000, image_url:'🥑', is_available:false, tags:[],           desc:'Alpukat mentega dengan susu cokelat kental manis.' },
  { id:'s1', category_id:'lainnya', name:'Kentang Goreng',             price:20000, image_url:'🍟', is_available:true,  tags:['Terlaris'], desc:'Kentang goreng renyah dengan saus sambal dan mayones.' },
  { id:'s2', category_id:'lainnya', name:'Pisang Goreng Keju',         price:18000, image_url:'🍌', is_available:true,  tags:[],           desc:'Pisang kepok goreng tepung dengan parutan keju dan susu.' },
  { id:'s3', category_id:'lainnya', name:'Roti Bakar Cokelat Keju',    price:22000, image_url:'🍞', is_available:true,  tags:[],           desc:'Roti tebal dipanggang mentega, isi cokelat dan keju.' },
  { id:'s4', category_id:'lainnya', name:'Croissant Butter',           price:24000, image_url:'🥐', is_available:true,  tags:[],           desc:'Croissant mentega dipanggang setiap pagi.' },
  { id:'s5', category_id:'lainnya', name:'Air Mineral',                price:8000,  image_url:'💧', is_available:true,  tags:[],           desc:'Air mineral botol 600 ml.' },
];
const menuById = Object.fromEntries(MENUS.map(m => [m.id, m]));
const catById = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
/** Bobot popularitas untuk data penjualan tiruan */
const MENU_WEIGHT = { m1:9, m2:7, m3:5, m4:5, m5:3, d1:12, d2:6, d3:5, d4:8, d5:4, d6:2, s1:8, s2:4, s3:4, s4:3, s5:4 };

/* ---------- Data: meja ---------- */
const TABLES = Array.from({ length:12 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return { id:'t' + n, table_number:n, qr_code:'ks-' + (0x3a7f1 + i * 977).toString(16), is_active: n !== '12', area: i < 8 ? 'Dalam' : 'Teras' };
});
const tableUrl = t => `halaman-utama.html?meja=${encodeURIComponent(t.table_number)}`;

/* ---------- Data: bahan & resep ---------- */
const INGREDIENTS = [
  { id:'i1',  name:'Biji kopi espresso', unit:'gram',  stock_qty:1850,  min_stock:1000 },
  { id:'i2',  name:'Susu segar',         unit:'ml',    stock_qty:4200,  min_stock:5000 },
  { id:'i3',  name:'Gula aren cair',     unit:'ml',    stock_qty:900,   min_stock:800 },
  { id:'i4',  name:'Bubuk matcha',       unit:'gram',  stock_qty:120,   min_stock:200 },
  { id:'i5',  name:'Teh melati',         unit:'gram',  stock_qty:650,   min_stock:300 },
  { id:'i6',  name:'Gula pasir',         unit:'gram',  stock_qty:3200,  min_stock:1000 },
  { id:'i7',  name:'Lemon',              unit:'pcs',   stock_qty:14,    min_stock:10 },
  { id:'i8',  name:'Alpukat',            unit:'pcs',   stock_qty:0,     min_stock:6 },
  { id:'i9',  name:'Beras',              unit:'gram',  stock_qty:12000, min_stock:5000 },
  { id:'i10', name:'Ayam fillet',        unit:'gram',  stock_qty:3200,  min_stock:2000 },
  { id:'i11', name:'Ayam potong (bakar)',unit:'pcs',   stock_qty:0,     min_stock:8 },
  { id:'i12', name:'Telur',              unit:'pcs',   stock_qty:42,    min_stock:30 },
  { id:'i13', name:'Mie kuning',         unit:'gram',  stock_qty:2400,  min_stock:1500 },
  { id:'i14', name:'Kentang beku',       unit:'gram',  stock_qty:1100,  min_stock:2000 },
  { id:'i15', name:'Pisang kepok',       unit:'pcs',   stock_qty:18,    min_stock:12 },
  { id:'i16', name:'Roti tawar tebal',   unit:'pcs',   stock_qty:10,    min_stock:8 },
  { id:'i17', name:'Croissant beku',     unit:'pcs',   stock_qty:16,    min_stock:10 },
  { id:'i18', name:'Keju cheddar',       unit:'gram',  stock_qty:600,   min_stock:300 },
  { id:'i19', name:'Air mineral 600 ml', unit:'botol', stock_qty:36,    min_stock:24 },
  { id:'i20', name:'Minyak goreng',      unit:'ml',    stock_qty:8000,  min_stock:5000 },
];
const ingById = Object.fromEntries(INGREDIENTS.map(i => [i.id, i]));
const RECIPE_ITEMS = [
  ['m1','i9',150],['m1','i12',1],['m1','i10',50],['m1','i20',20],
  ['m2','i10',150],['m2','i9',150],['m2','i20',60],
  ['m3','i13',120],['m3','i12',1],['m3','i20',20],
  ['m4','i10',120],['m4','i9',150],
  ['m5','i11',1],['m5','i9',150],
  ['d1','i1',18],['d1','i2',150],['d1','i3',25],
  ['d2','i1',18],
  ['d3','i4',6],['d3','i2',180],
  ['d4','i5',5],['d4','i6',20],
  ['d5','i5',5],['d5','i7',1],
  ['d6','i8',1],['d6','i2',50],
  ['s1','i14',150],['s1','i20',40],
  ['s2','i15',2],['s2','i18',20],['s2','i20',40],
  ['s3','i16',2],['s3','i18',20],
  ['s4','i17',1],
  ['s5','i19',1],
].map(([menu_id, ingredient_id, qty_used], i) => ({ id:'r' + (i + 1), menu_id, ingredient_id, qty_used }));
const recipeOf = menuId => RECIPE_ITEMS.filter(r => r.menu_id === menuId);
const menusUsing = ingId => RECIPE_ITEMS.filter(r => r.ingredient_id === ingId).map(r => menuById[r.menu_id]);
/** 'HABIS' | 'MENIPIS' | 'AMAN' */
const stockStatus = ing => ing.stock_qty <= 0 ? 'HABIS' : ing.stock_qty <= ing.min_stock ? 'MENIPIS' : 'AMAN';
const STOCK_BADGE = { AMAN:['ok','Aman'], MENIPIS:['warn','Menipis'], HABIS:['danger','Habis'] };
const lowStock = () => INGREDIENTS.filter(i => stockStatus(i) !== 'AMAN');

/* ---------- Data: akun & peran ---------- */
const NOW = Date.now();
const STAFF = [
  { id:'u1', name:'Iul Rahman',     email:'iul@kedaisenja.id',   role:'OWNER',   is_active:true,  created_at:'2025-02-03', last_login:NOW - 6 * 60e3,        color:'#D2552A' },
  { id:'u2', name:'Rina Kartika',   email:'rina@kedaisenja.id',  role:'CASHIER', is_active:true,  created_at:'2025-03-10', last_login:NOW - 42 * 60e3,       color:'#2F7D50' },
  { id:'u3', name:'Dimas Pratama',  email:'dimas@kedaisenja.id', role:'CASHIER', is_active:true,  created_at:'2025-08-21', last_login:NOW - 26 * 3600e3,     color:'#2C5597' },
  { id:'u4', name:'Sari Wulandari', email:'sari@kedaisenja.id',  role:'CASHIER', is_active:false, created_at:'2025-04-02', last_login:NOW - 40 * 86400e3,    color:'#9A6212' },
];
const ROLE_LABEL = { OWNER:'Pemilik', CASHIER:'Kasir' };
const PERMISSIONS = [
  { key:'pos',        label:'Buka layar kasir & proses pesanan', OWNER:true, CASHIER:true },
  { key:'payment',    label:'Terima pembayaran & cetak struk',   OWNER:true, CASHIER:true },
  { key:'stock_view', label:'Lihat sisa stok bahan',             OWNER:true, CASHIER:true },
  { key:'stock_in',   label:'Catat bahan masuk',                 OWNER:true, CASHIER:true },
  { key:'menu',       label:'Ubah menu, harga & ketersediaan',   OWNER:true, CASHIER:false },
  { key:'tables',     label:'Atur meja & cetak QR',              OWNER:true, CASHIER:false },
  { key:'report',     label:'Lihat laporan penjualan',           OWNER:true, CASHIER:false },
  { key:'staff',      label:'Kelola akun staf',                  OWNER:true, CASHIER:false },
  { key:'settings',   label:'Ubah pengaturan kafe',              OWNER:true, CASHIER:false },
];
const currentRole = () => store.get(KEYS.role, 'OWNER') === 'CASHIER' ? 'CASHIER' : 'OWNER';
const currentUser = () => STAFF.find(s => s.id === (currentRole() === 'CASHIER' ? 'u2' : 'u1'));

/* ---------- Pesanan ---------- */
const ORDER_STATUS = {
  MENUNGGU:   { label:'Baru',       tone:'accent' },
  DIPROSES:   { label:'Diproses',   tone:'info' },
  SIAP:       { label:'Siap',       tone:'ok' },
  DIANTAR:    { label:'Diantar',    tone:'' },
  SELESAI:    { label:'Selesai',    tone:'ok' },
  DIBATALKAN: { label:'Dibatalkan', tone:'danger' },
};
const PAY_METHOD = { CASH:'Tunai', NON_CASH:'Non-tunai' };

/** Hitung subtotal, pajak, layanan, dan total dari daftar item {price, qty} */
function orderTotals(items, s = SETTINGS) {
  const sub = sum(items, i => i.price * i.qty);
  const tax = Math.round(sub * s.tax_percent / 100);
  const service = Math.round(sub * s.service_percent / 100);
  return { sub, tax, service, total: sub + tax + service, count: sum(items, i => i.qty) };
}

/**
 * Riwayat transaksi tiruan (deterministik) untuk `days` hari ke belakang, termasuk hari ini
 * sampai jam sekarang. Bentuk: { code, created_at, order_type, table, items[], sub, tax, total,
 * status, payment_status, payment_method, cashier }
 */
function genTransactions(days = 60) {
  const r = rng(20261011);
  const pickMenu = (() => {
    const pool = MENUS.flatMap(m => Array(MENU_WEIGHT[m.id] || 1).fill(m));
    return () => pool[Math.floor(r() * pool.length)];
  })();
  const hourW = [0,0,0,0,0,0,0,0, 3,4,5,7,10,9,6,5,6,8,10,9,7,5,3,0]; // 08–22
  const hourPool = hourW.flatMap((w, h) => Array(w).fill(h));
  const cashiers = STAFF.filter(s => s.role === 'CASHIER');
  const out = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(today); day.setDate(today.getDate() - d);
    const dow = day.getDay();
    const weekend = dow === 0 || dow === 6;
    const trend = 1 + (days - d) / days * 0.12; // sedikit naik dari waktu ke waktu
    const n = Math.round((weekend ? 58 : 40) * trend * (0.85 + r() * 0.3));
    const times = Array.from({ length:n }, () => {
      const t = new Date(day);
      t.setHours(hourPool[Math.floor(r() * hourPool.length)], Math.floor(r() * 60), Math.floor(r() * 60));
      return t;
    }).filter(t => t <= Date.now()).sort((a, b) => a - b);
    times.forEach((t, i) => {
      const lines = {};
      const k = 1 + Math.floor(r() * r() * 4);
      for (let j = 0; j < k; j++) {
        const m = pickMenu();
        lines[m.id] = lines[m.id] || { menu_id:m.id, name:m.name, image_url:m.image_url, price:m.price, qty:0, note:'' };
        lines[m.id].qty += r() < .8 ? 1 : 2;
      }
      const items = Object.values(lines);
      const qr = r() < .7;
      const cancelled = r() < .02;
      out.push({
        code: 'A-' + String(i + 1).padStart(3, '0'),
        created_at: t,
        order_type: qr ? 'QR' : 'MANUAL',
        table: qr || r() < .5 ? TABLES[Math.floor(r() * 11)].table_number : null,
        items,
        ...orderTotals(items),
        status: cancelled ? 'DIBATALKAN' : 'SELESAI',
        payment_status: cancelled ? 'BELUM' : 'LUNAS',
        payment_method: cancelled ? null : r() < .4 ? 'CASH' : 'NON_CASH',
        cashier: cashiers[Math.floor(r() * 2)].name,
      });
    });
  }
  return out.sort((a, b) => b.created_at - a.created_at);
}

/* ---------- Struk ---------- */
/** HTML struk pelanggan. `o` = pesanan dengan items, code, created_at, table, payment_* */
function receiptHTML(o, s = SETTINGS) {
  const t = orderTotals(o.items, s);
  const R = s.receipt;
  const num = n => Math.round(n).toLocaleString('id-ID');
  return `<div class="receipt-paper">
    ${R.show_logo ? `<div class="rc-logo">${esc(initials(s.cafe_name))}</div>` : ''}
    <div class="rc-c"><div class="rc-name">${esc(s.cafe_name)}</div>
      ${R.show_address ? `${esc(s.address)}<br>${esc(s.phone)}` : ''}
      ${R.header ? `<div style="margin-top:6px">${esc(R.header)}</div>` : ''}</div>
    <div class="rc-sep"></div>
    <div class="rc-row"><span>${esc(o.code)}</span><span>${tgl(o.created_at, { day:'2-digit', month:'2-digit', year:'numeric' })} ${hhmm(o.created_at)}</span></div>
    ${R.show_table ? `<div class="rc-row"><span>${o.table ? 'Meja ' + esc(o.table) : 'Bawa pulang'}</span><span>${o.order_type === 'MANUAL' ? 'Kasir' : 'QR'}</span></div>` : ''}
    ${R.show_cashier ? `<div class="rc-row"><span>Kasir</span><span>${esc(o.cashier || currentUser().name)}</span></div>` : ''}
    <div class="rc-sep"></div>
    ${o.items.map(i => `<div class="rc-item"><div>${esc(i.name)}</div>
      <div class="rc-row"><span>${i.qty} x ${num(i.price)}</span><span>${num(i.price * i.qty)}</span></div>
      ${R.show_notes && i.note ? `<div class="rc-note">* ${esc(i.note)}</div>` : ''}</div>`).join('')}
    <div class="rc-sep"></div>
    <div class="rc-row"><span>Subtotal</span><span>${num(t.sub)}</span></div>
    ${s.tax_percent ? `<div class="rc-row"><span>Pajak ${s.tax_percent}%</span><span>${num(t.tax)}</span></div>` : ''}
    ${s.service_percent ? `<div class="rc-row"><span>Layanan ${s.service_percent}%</span><span>${num(t.service)}</span></div>` : ''}
    <div class="rc-row rc-total"><span>TOTAL</span><span>${num(t.total)}</span></div>
    ${o.payment_status === 'LUNAS' ? `
      <div class="rc-row"><span>${o.payment_method === 'CASH' ? 'Tunai' : 'Non-tunai' + (o.payment_channel ? ' (' + esc(o.payment_channel) + ')' : '')}</span><span>${num(o.paid_amount || t.total)}</span></div>
      ${o.payment_method === 'CASH' ? `<div class="rc-row"><span>Kembali</span><span>${num((o.paid_amount || t.total) - t.total)}</span></div>` : ''}
      <div class="rc-c" style="margin-top:6px;font-weight:800">** LUNAS **</div>` : `<div class="rc-c" style="margin-top:6px">BELUM DIBAYAR</div>`}
    <div class="rc-sep"></div>
    <div class="rc-c">${esc(R.footer)}</div>
  </div>`;
}
function printReceipt(html) {
  let el = $('#printArea');
  if (!el) { el = document.createElement('div'); el.id = 'printArea'; document.body.appendChild(el); }
  el.innerHTML = html;
  window.print();
}

/** Unduh CSV (dipisah titik koma agar rapi di Excel lokal Indonesia) */
function downloadCSV(filename, rows) {
  const cell = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = '\uFEFF' + rows.map(r => r.map(cell).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** QR ilustrasi (bukan QR asli — untuk prototipe tampilan saja) */
function fakeQR(text, px = 160) {
  const N = 25;
  const r = rng([...String(text)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
  const finder = [[0, 0], [N - 7, 0], [0, N - 7]];
  let d = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let on;
    const f = finder.find(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
    if (f) { const dx = x - f[0], dy = y - f[1]; on = dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4); }
    else if ((x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8)) on = false;
    else if (y === 6) on = x % 2 === 0;
    else if (x === 6) on = y % 2 === 0;
    else on = r() > .52;
    if (on) d += `M${x} ${y}h1v1h-1z`;
  }
  return `<svg viewBox="-2 -2 ${N + 4} ${N + 4}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="QR code meja (ilustrasi)"><rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/><path d="${d}" fill="#24170E"/></svg>`;
}

/* ---------- Ikon (gaya garis, 24×24) ---------- */
const _svg = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  orders: _svg('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>'),
  menu: _svg('<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>'),
  box: _svg('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
  chart: _svg('<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16V6"/>'),
  users: _svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
  settings: _svg('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'),
  logout: _svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>'),
  plus: _svg('<path d="M12 5v14M5 12h14"/>'),
  minus: _svg('<path d="M5 12h14"/>'),
  search: _svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  x: _svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  check: _svg('<path d="M20 6 9 17l-5-5"/>'),
  edit: _svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  trash: _svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  printer: _svg('<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'),
  download: _svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>'),
  upload: _svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>'),
  qr: _svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM21 14v.01M14 21h.01M17 21h4v-4"/>'),
  grid: _svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'),
  bell: _svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  clock: _svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  cash: _svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'),
  card: _svg('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'),
  alert: _svg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>'),
  external: _svg('<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  chevronRight: _svg('<path d="m9 18 6-6-6-6"/>'),
  chevronLeft: _svg('<path d="m15 18-6-6 6-6"/>'),
  chevronDown: _svg('<path d="m6 9 6 6 6-6"/>'),
  arrowUp: _svg('<path d="m5 12 7-7 7 7M12 19V5"/>'),
  arrowDown: _svg('<path d="M12 5v14M19 12l-7 7-7-7"/>'),
  eye: _svg('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
  lock: _svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  shield: _svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
  store: _svg('<path d="M3 9 4.5 4h15L21 9"/><path d="M3 9h18v1a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z"/><path d="M5 13v8h14v-8M10 21v-5h4v5"/>'),
  zap: _svg('<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>'),
  calendar: _svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  note: _svg('<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>'),
  image: _svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'),
  refresh: _svg('<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>'),
  bag: _svg('<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>'),
  user: _svg('<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>'),
  mail: _svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
  trendUp: _svg('<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>'),
  more: _svg('<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>'),
};
/** Ikon dengan ukuran lain: icon('plus', 14) */
const icon = (name, size = 18) => ICON[name].replace('width="18" height="18"', `width="${size}" height="${size}"`);

/* ---------- Shell: sidebar + gerbang peran ---------- */
const NAV = [
  { group:'Operasional', items:[
    { key:'kasir',      href:'kasir.html',      label:'Pesanan',     icon:'orders',   roles:['OWNER','CASHIER'] },
    { key:'stok',       href:'stok.html',       label:'Stok Bahan',  icon:'box',      roles:['OWNER','CASHIER'] },
  ]},
  { group:'Kelola', items:[
    { key:'menu',       href:'menu.html',       label:'Menu & Meja', icon:'menu',     roles:['OWNER'] },
  ]},
  { group:'Insight & Akun', items:[
    { key:'dashboard',  href:'dashboard.html',  label:'Penjualan',   icon:'chart',    roles:['OWNER'] },
    { key:'staf',       href:'staf.html',       label:'Akun & Staf', icon:'users',    roles:['OWNER'] },
    { key:'pengaturan', href:'pengaturan.html', label:'Pengaturan',  icon:'settings', roles:['OWNER'] },
  ]},
];

function renderShell() {
  const side = $('#side');
  if (!side) return;
  const page = document.body.dataset.page;
  const role = currentRole();
  const user = currentUser();
  side.innerHTML = `
    <a class="side-brand" href="index.html" title="Daftar prototipe">
      <span class="logo">${esc(initials(SETTINGS.cafe_name))}</span>
      <div><strong>${esc(SETTINGS.cafe_name)}</strong><small>IUL FnB · POS</small></div>
    </a>
    <nav class="nav" aria-label="Navigasi utama">
      ${NAV.map(g => {
        const items = g.items.filter(i => i.roles.includes(role));
        if (!items.length) return '';
        return `<div class="nav-label">${g.group}</div>` + items.map(i => `
          <a href="${i.href}"${i.key === page ? ' aria-current="page"' : ''} title="${i.label}">
            ${ICON[i.icon]}<span class="lbl">${i.label}</span><span class="count" data-count="${i.key}" hidden></span>
          </a>`).join('');
      }).join('')}
    </nav>
    <div class="side-foot">
      <a class="side-link" href="halaman-utama.html" target="_blank" rel="noopener" title="Buka menu pelanggan (QR)">${ICON.external}<span class="lbl">Menu pelanggan (QR)</span></a>
      <div class="user">
        <span class="avatar" style="--av:${user.color}">${esc(initials(user.name))}</span>
        <div class="who"><strong>${esc(user.name)}</strong><small>${ROLE_LABEL[role]}</small></div>
        <a class="icon-btn sm" href="login.html" title="Keluar" aria-label="Keluar">${icon('logout', 16)}</a>
      </div>
    </div>`;
  const low = lowStock().length;
  setNavCount('stok', low, 'warn');

  // Gerbang akses: kasir tidak bisa membuka halaman khusus pemilik
  const item = NAV.flatMap(g => g.items).find(i => i.key === page);
  if (item && !item.roles.includes(role)) {
    const main = $('.main');
    if (main) main.innerHTML = `<div class="locked-view"><div>
      <div class="ico">${icon('lock', 28)}</div>
      <h2>Halaman ini khusus Pemilik</h2>
      <p>Akun <strong>${esc(user.name)}</strong> (${ROLE_LABEL[role]}) tidak punya akses ke <strong>${item.label}</strong>. Minta pemilik mengubah hak akses di menu Akun & Staf.</p>
      <a class="btn btn-primary" href="kasir.html">${ICON.orders} Kembali ke Pesanan</a>
    </div></div>`;
    document.body.dataset.locked = 'true';
  }
}
function setNavCount(key, n, tone) {
  const el = $(`[data-count="${key}"]`);
  if (!el) return;
  el.hidden = !n;
  el.textContent = n;
  el.classList.toggle('warn', tone === 'warn');
}

/* ---------- Lapisan (modal / drawer / overlay) bertumpuk ---------- */
const layers = [];
let _layerReturnFocus = [];
function openLayer(id) {
  const el = document.getElementById(id);
  if (!el || layers.includes(id)) return;
  _layerReturnFocus.push(document.activeElement);
  layers.push(id);
  el.classList.add('show');
  ensureScrim().classList.add('show');
  document.body.classList.add('locked');
  setTimeout(() => {
    const f = el.querySelector('[autofocus]') || el.querySelector('[data-close]');
    f?.focus({ preventScroll:true });
  }, 80);
}
function closeLayer(id) {
  id = id || layers[layers.length - 1];
  const i = layers.indexOf(id);
  if (i < 0) return;
  layers.splice(i, 1);
  document.getElementById(id).classList.remove('show');
  const back = _layerReturnFocus.splice(i, 1)[0];
  if (!layers.length) { ensureScrim().classList.remove('show'); document.body.classList.remove('locked'); }
  if (back && document.contains(back)) back.focus({ preventScroll:true });
}
const isOpen = id => layers.includes(id);
function ensureScrim() {
  let s = $('#scrim');
  if (!s) { s = document.createElement('div'); s.id = 'scrim'; s.className = 'scrim'; document.body.appendChild(s); }
  return s;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-close]');
  if (c) { closeLayer(c.closest('.modal, .drawer, .overlay')?.id); return; }
  if (e.target.id === 'scrim') closeLayer();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && layers.length) closeLayer(); });

/* ---------- Toast ---------- */
let _toastTimer;
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

renderShell();
