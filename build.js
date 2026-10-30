#!/usr/bin/env node
/*
 * Tạo website thiệp cưới từ noi-dung.md + src/ + anh/ + nhac/  →  thư mục website/
 *
 *   node build.js           tạo website/
 *   node build.js --serve   tạo website/, mở máy chủ xem thử và tự tạo lại khi bạn sửa file
 *
 * Không cần cài thêm thư viện nào (chỉ cần Node.js 18+).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

const GOC = __dirname;
const RA = path.join(GOC, 'website');
const FILE_NOI_DUNG = path.join(GOC, 'noi-dung.md');

// Ảnh trong noi-dung.md -> phần tử trên thiệp
const O_ANH = {
  'Ảnh bìa': 'IMAGE2',
  'Ảnh cạnh nhà trai': 'IMAGE6',
  'Ảnh cạnh nhà gái': 'IMAGE5',
  'Ảnh thư mời trái': 'IMAGE8',
  'Ảnh thư mời giữa': 'IMAGE7',
  'Ảnh thư mời phải': 'IMAGE9',
  'Ảnh nền lịch': 'IMAGE86',
  'Ảnh cảm ơn cuối trang': 'IMAGE48',
  'Ảnh popup cảm ơn': 'IMAGE58',
  // album: đánh số theo thứ tự hiển thị từ trên xuống (2 cột so le)
  'Album ảnh 01': 'IMAGE96', 'Album ảnh 02': 'IMAGE95', 'Album ảnh 03': 'IMAGE94',
  'Album ảnh 04': 'IMAGE97', 'Album ảnh 05': 'IMAGE98', 'Album ảnh 06': 'IMAGE99',
  'Album ảnh 07': 'IMAGE102', 'Album ảnh 08': 'IMAGE101', 'Album ảnh 09': 'IMAGE105',
  'Album ảnh 10': 'IMAGE103', 'Album ảnh 11': 'IMAGE106', 'Album ảnh 12': 'IMAGE104',
  'Album ảnh 13': 'IMAGE107',
};
// Vị trí cắt ảnh khi khung khác tỉ lệ ảnh (mặc định: giữa). Khung popup thấp nên lấy cao hơn để không cắt mất mặt.
const VI_TRI_ANH = { IMAGE58: 'center top' };
const O_QR = { 'Tài khoản 1 - ảnh QR': 'IMAGE114', 'Tài khoản 2 - ảnh QR': 'IMAGE115' };

// Toạ độ lưới lịch (px, trong khung lịch rộng 420px) – lấy từ thiết kế gốc
const LICH = {
  trai: 45.355,
  cot: [0, 46.43, 92.95, 139.46, 184.08, 229.02, 275.37],
  hangDau5: 220.16, // tháng cần 5 hàng
  hangDau6: 187.65, // tháng cần 6 hàng
  khoangHang: 32.515,
  timLech: { trai: -21.03, tren: -21.4 },
};

class LoiNoiDung extends Error {}

/* ------------------------------------------------------------------ đọc noi-dung.md */
function chuanHoa(nhan) {
  return nhan.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function docNoiDung() {
  const dong = fs.readFileSync(FILE_NOI_DUNG, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
  const batDau = dong.findIndex((d) => d.trim() === '---'); // phần giải thích ở đầu file bỏ qua
  const muc = new Map();
  dong.slice(batDau + 1).forEach((d, i) => {
    const m = d.match(/^\s*[-*]\s+([^:]+?)\s*:\s?(.*)$/);
    if (!m) return;
    const khoa = chuanHoa(m[1]);
    if (muc.has(khoa)) console.warn(`⚠️  noi-dung.md dòng ${batDau + i + 2}: mục "${m[1]}" bị lặp, dùng giá trị sau cùng.`);
    muc.set(khoa, { nhan: m[1].trim(), giaTri: m[2].trim() });
  });
  return muc;
}

/* ------------------------------------------------------------------ tiện ích */
const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;');
// "|" = xuống dòng, "\|" = ký tự | thật
const GACH = '\u0000';
const nhieuDong = (s) => s.replace(/\\\|/g, GACH).split('|').map((x) => escHtml(x.trim()).replace(/\u0000/g, '|')).join('<br>');
const laLinkNgoai = (s) => /^(https?:)?\/\//i.test(s) || s.startsWith('data:');

function taoBoDoc(muc) {
  const thieu = new Set();
  const lay = (nhan) => {
    const m = muc.get(chuanHoa(nhan));
    if (!m) { thieu.add(nhan); return ''; }
    return m.giaTri;
  };
  return { lay, thieu };
}

function kiemTraFile(duongDan, nhan) {
  if (!duongDan || laLinkNgoai(duongDan)) return;
  const p = path.join(GOC, decodeURI(duongDan));
  if (!fs.existsSync(p)) console.warn(`⚠️  "${nhan}": không tìm thấy file ${duongDan}`);
}

/* ------------------------------------------------------------------ các phần được tính toán */
function taoLich(lay) {
  const thang = parseInt(lay('Lịch - tháng'), 10);
  const nam = parseInt(lay('Lịch - năm'), 10);
  const ngayDanhDau = parseInt(lay('Lịch - ngày đánh dấu'), 10);
  if (!(thang >= 1 && thang <= 12) || !(nam > 1900)) {
    throw new LoiNoiDung('"Lịch - tháng" phải là số 1-12 và "Lịch - năm" là năm (vd. 2026).');
  }
  const soNgay = new Date(nam, thang, 0).getDate();
  const thuDau = (new Date(nam, thang - 1, 1).getDay() + 6) % 7; // 0 = thứ 2
  const soHang = Math.ceil((thuDau + soNgay) / 7);
  const hangDau = soHang > 5 ? LICH.hangDau6 : LICH.hangDau5;

  let html = '';
  let tim = 'display:none;';
  for (let d = 1; d <= soNgay; d++) {
    const o = thuDau + d - 1;
    const trai = +(LICH.trai + LICH.cot[o % 7]).toFixed(3);
    const tren = +(hangDau + Math.floor(o / 7) * LICH.khoangHang).toFixed(3);
    html += `<div class="ladi-element lich-ngay" style="top: ${tren}px; left: ${trai}px;"><h3 class="ladi-headline">${d}</h3></div>`;
    if (d === ngayDanhDau) {
      tim = `top: ${+(tren + LICH.timLech.tren).toFixed(3)}px; left: ${+(trai + LICH.timLech.trai).toFixed(3)}px;`;
    }
  }
  if (tim.startsWith('display') && lay('Lịch - ngày đánh dấu')) {
    console.warn(`⚠️  "Lịch - ngày đánh dấu" = ${lay('Lịch - ngày đánh dấu')} không có trong tháng ${thang}/${nam}.`);
  }
  return {
    '@lich-tieu-de': `THÁNG ${String(thang).padStart(2, '0')} - ${nam}`,
    '@lich-cac-ngay': html,
    '@lich-vi-tri-tim': tim,
  };
}

function taoBanDo(lay) {
  const link = lay('Địa điểm - bản đồ');
  const diaChi = lay('Địa điểm - địa chỉ').replace(/\|/g, ' ');
  if (/^https?:\/\/(www\.)?google\.[^/]+\/maps\/embed/i.test(link) || /output=embed/.test(link)) return link;
  if (link) {
    console.warn('⚠️  "Địa điểm - bản đồ" không phải link nhúng (embed) của Google Maps, dùng địa chỉ để tìm bản đồ.');
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(diaChi)}&z=16&output=embed`;
}

const laKhong = (v) => /^(không|khong|ko|no|0|ẩn)$/i.test(v.trim());

function taoCssAnh(lay) {
  let css = '';
  for (const [nhan, id] of Object.entries(O_ANH)) {
    const anh = lay(nhan);
    kiemTraFile(anh, nhan);
    css += `#${id} > .ladi-image > .ladi-image-background{background-image: url("${encodeURI(anh)}"); top: 0; left: 0; width: 100%; height: 100%; background-position: ${VI_TRI_ANH[id] || 'center center'};}\n`;
  }
  for (const [nhan, id] of Object.entries(O_QR)) {
    const anh = lay(nhan);
    kiemTraFile(anh, nhan);
    css += `#${id} > .ladi-image > .ladi-image-background{background-image: url("${encodeURI(anh)}"); top: 0; left: 0; width: 100%; height: 100%; background-size: contain; background-position: center center;}\n`;
  }
  if (laKhong(lay('Hiện nút gửi lời chúc (có/không)'))) {
    // bỏ nút, kéo nút "Gửi Mừng Cưới" lên và thu khung trắng cho gọn
    css += '#BUTTON12 {display: none !important;}\n#BUTTON9 {top: 2448.56px;}\n#BOX18 {height: 250px;}\n';
  }
  if (laKhong(lay('Hiện nút quà nổi (có/không)'))) {
    css += '#gift-icon, #qr-popup {display: none !important;}\n';
  }
  return css;
}

function chuanHoaGoc(goc) {
  goc = (goc || '/').trim();
  if (!goc.startsWith('/')) goc = '/' + goc;
  if (!goc.endsWith('/')) goc += '/';
  return goc;
}

// Đọc kích thước ảnh JPEG/PNG từ phần đầu file (không cần thư viện) để khai báo cho Zalo/Facebook
function kichThuocAnh(duongDan) {
  try {
    const b = fs.readFileSync(path.join(GOC, decodeURI(duongDan)));
    if (b.readUInt32BE(0) === 0x89504e47) return { rong: b.readUInt32BE(16), cao: b.readUInt32BE(20) };
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const loai = b[i + 1];
      if (loai >= 0xc0 && loai <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(loai)) return { rong: b.readUInt16BE(i + 7), cao: b.readUInt16BE(i + 5) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  } catch (e) { /* bỏ qua: chỉ là thông tin phụ */ }
  return null;
}

function diaChiDayDu(lay, duongDan) {
  if (!duongDan || laLinkNgoai(duongDan)) return duongDan;
  const web = lay('Địa chỉ website').replace(/\/+$/, '');
  return web + chuanHoaGoc(lay('Đường dẫn gốc')) + encodeURI(duongDan);
}

/* ------------------------------------------------------------------ điền template */
function dien(template, lay, tinhSan) {
  return template.replace(/\{\{\s*(?:(attr|url):)?([^}]+?)\s*\}\}/g, (_, kieu, ten) => {
    if (ten.startsWith('@')) {
      if (!(ten in tinhSan)) throw new Error(`Template dùng {{${ten}}} nhưng build.js chưa tính.`);
      return tinhSan[ten];
    }
    const v = lay(ten);
    if (kieu === 'attr') return escAttr(v.replace(/\\\|/g, GACH).replace(/\s*\|\s*/g, ' ').replace(/\u0000/g, '|'));
    if (kieu === 'url') { kiemTraFile(v, ten); return escAttr(laLinkNgoai(v) ? v : encodeURI(v)); }
    return nhieuDong(v);
  });
}

function build() {
  const batDau = Date.now();
  const muc = docNoiDung();
  const { lay, thieu } = taoBoDoc(muc);

  const goc = chuanHoaGoc(lay('Đường dẫn gốc'));
  const luaChon = lay('Lời chúc - các lựa chọn tham dự').split('|').map((s) => s.trim()).filter(Boolean)
    .map((s) => `<option value="${escAttr(s)}">${escHtml(s)}</option>`).join('');
  const cauHinh = {
    linkGoogleSheet: lay('Lời chúc - link Google Sheet') || '',
  };
  const tinhSan = {
    '@duong-dan-goc': escAttr(goc),
    '@anh-chia-se': escAttr(diaChiDayDu(lay, lay('Ảnh khi chia sẻ'))),
    '@anh-chia-se-kich-thuoc': (() => {
      const f = lay('Ảnh khi chia sẻ');
      const k = f && !laLinkNgoai(f) && kichThuocAnh(f);
      return k ? `<meta property="og:image:width" content="${k.rong}">
<meta property="og:image:height" content="${k.cao}">` : '';
    })(),
    '@css-anh': '\n' + taoCssAnh(lay),
    '@ban-do': escAttr(taoBanDo(lay)),
    '@lua-chon-tham-du': luaChon,
    '@cau-hinh-js': JSON.stringify(cauHinh).replace(/</g, '\\u003c'),
    '@dia-chi-website': escAttr(lay('Địa chỉ website').replace(/\/+$/, '') + goc),
    ...taoLich(lay),
  };

  const coManMo = !laKhong(lay('Màn mở thiệp - bật (có/không)'));
  tinhSan['@body-class'] = '';
  tinhSan['@man-mo-thiep'] = coManMo ? dien(fs.readFileSync(path.join(GOC, 'src/man-mo.html'), 'utf8'), lay, {}) : '';
  const thiep = dien(fs.readFileSync(path.join(GOC, 'src/thiep.html'), 'utf8'), lay, tinhSan);
  const taoLink = dien(fs.readFileSync(path.join(GOC, 'src/tao-link.html'), 'utf8'), lay, tinhSan);
  if (thieu.size) {
    throw new LoiNoiDung('noi-dung.md thiếu các mục sau (có thể bạn đã lỡ sửa/xoá tên mục):\n   - ' + [...thieu].join('\n   - '));
  }

  fs.rmSync(RA, { recursive: true, force: true });
  fs.mkdirSync(RA, { recursive: true });
  for (const thuMuc of ['css', 'js', 'fonts']) fs.cpSync(path.join(GOC, 'src', thuMuc), path.join(RA, thuMuc), { recursive: true });
  for (const thuMuc of ['anh', 'nhac']) fs.cpSync(path.join(GOC, thuMuc), path.join(RA, thuMuc), { recursive: true });

  fs.writeFileSync(path.join(RA, 'index.html'), thiep);
  fs.writeFileSync(path.join(RA, '404.html'), thiep); // GitHub Pages: mọi đường dẫn lạ đều hiện thiệp
  fs.mkdirSync(path.join(RA, 'tao-link'));
  fs.writeFileSync(path.join(RA, 'tao-link', 'index.html'), taoLink);
  // Netlify / Cloudflare Pages: mọi đường dẫn lạ đều hiện thiệp (file có thật vẫn được ưu tiên)
  fs.writeFileSync(path.join(RA, '_redirects'), '/tao-link  /tao-link/index.html  200\n/*  /index.html  200\n');
  // Vercel
  fs.writeFileSync(path.join(RA, 'vercel.json'), JSON.stringify({
    cleanUrls: true,
    rewrites: [{ source: '/((?!tao-link).*)', destination: '/index.html' }],
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(RA, '.nojekyll'), '');

  console.log(`✅ Đã tạo website/ (${Date.now() - batDau} ms)`);
}

/* ------------------------------------------------------------------ máy chủ xem thử */
const KIEU = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

function moMayChu(cong) {
  http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(RA, path.normalize(p).replace(/^(\.\.[\\/])+/, ''));
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(RA) || !fs.existsSync(file)) file = path.join(RA, 'index.html'); // link tuỳ ý -> thiệp
    const dau = { 'Content-Type': KIEU[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
    const tong = fs.statSync(file).size;
    // Trình duyệt (nhất là Safari/iPhone) xin nhạc/video theo từng đoạn bằng "Range"
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range && (range[1] || range[2])) {
      let bd = range[1] ? Number(range[1]) : Math.max(0, tong - Number(range[2]));
      let kt = range[1] && range[2] ? Math.min(Number(range[2]), tong - 1) : tong - 1;
      if (bd > kt || bd >= tong) { res.writeHead(416, { 'Content-Range': `bytes */${tong}` }); return res.end(); }
      res.writeHead(206, { ...dau, 'Content-Range': `bytes ${bd}-${kt}/${tong}`, 'Content-Length': kt - bd + 1 });
      return fs.createReadStream(file, { start: bd, end: kt }).pipe(res);
    }
    res.writeHead(200, { ...dau, 'Content-Length': tong });
    fs.createReadStream(file).pipe(res);
  }).listen(cong, () => {
    console.log(`\n🌐 Xem thiệp:      http://localhost:${cong}/`);
    console.log(`🔗 Trang tạo link: http://localhost:${cong}/tao-link/`);
    console.log('   (Sửa noi-dung.md / ảnh rồi tải lại trang. Ctrl+C để dừng.)\n');
  });
}

function theoDoi() {
  let hen = null;
  const chay = () => {
    clearTimeout(hen);
    hen = setTimeout(() => {
      try { build(); } catch (e) { console.error('❌ ' + e.message); }
    }, 300);
  };
  for (const p of ['noi-dung.md', 'src', 'anh', 'nhac']) {
    fs.watch(path.join(GOC, p), { recursive: true }, chay);
  }
}

try {
  build();
} catch (e) {
  console.error('❌ ' + e.message);
  if (!(e instanceof LoiNoiDung)) console.error(e.stack);
  if (!process.argv.includes('--serve')) process.exit(1);
}
if (process.argv.includes('--serve')) {
  moMayChu(Number(process.env.PORT) || 8080);
  theoDoi();
}
