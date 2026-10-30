/*
 * Các chức năng của thiệp: hiệu ứng khi cuộn, popup, form lời chúc, nhạc nền, nút quà, nút cuộn.
 * Cấu hình (link Google Sheet, ...) được build.js đưa vào window.THIEP từ noi-dung.md.
 */
(function () {
  'use strict';
  var CFG = window.THIEP || {};

  /* ---------------------------------------------------------------- hiệu ứng khi cuộn tới */
  function batHieuUng() {
    var an = document.getElementById('style_animation');
    var ds = document.querySelectorAll('.ladi-animation-hidden');
    var hien = function (el) {
      el.classList.remove('ladi-animation-hidden');
      el.classList.add('ladi-animation');
    };
    if (!('IntersectionObserver' in window)) {
      ds.forEach(hien);
    } else {
      var xuLy = function (entries, io) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { hien(e.target); io.unobserve(e.target); }
        });
      };
      var io = new IntersectionObserver(xuLy);
      // Ảnh album bắt đầu hiện khi còn cách mép dưới màn hình một đoạn, để không thấy ô trống lúc cuộn
      var ioAlbum = new IntersectionObserver(xuLy, { rootMargin: '0px 0px 15% 0px' });
      ds.forEach(function (el) { (el.closest('#GROUP74') ? ioAlbum : io).observe(el); });
    }
    if (an) an.parentNode.removeChild(an);
  }

  /* Giải mã trước ảnh album khi trang rảnh, tránh giật lúc ảnh vừa hiện ra */
  function giaiMaTruocAnhAlbum() {
    document.querySelectorAll('#GROUP74 .ladi-image-background').forEach(function (el) {
      var m = getComputedStyle(el).backgroundImage.match(/url\("?(.*?)"?\)/);
      if (!m) return;
      var img = new Image();
      img.src = m[1];
      if (img.decode) img.decode().catch(function () {});
    });
  }

  /* ---------------------------------------------------------------- popup */
  var backdrop = document.getElementById('backdrop-popup');
  var popupDangMo = null;

  function moPopup(id) {
    var el = document.getElementById(id);
    if (!el) return;
    dongPopup();
    if (!el.querySelector('.popup-close')) {
      var x = document.createElement('div');
      x.className = 'popup-close';
      x.addEventListener('click', dongPopup);
      el.appendChild(x);
    }
    el.style.display = 'block';
    backdrop.style.cssText = 'display:block;background-color:rgba(0,0,0,0.5);';
    popupDangMo = el;
  }

  function dongPopup() {
    if (popupDangMo) popupDangMo.style.display = 'none';
    backdrop.style.display = 'none';
    popupDangMo = null;
  }

  backdrop.addEventListener('click', dongPopup);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dongPopup(); });
  document.querySelectorAll('[data-mo-popup]').forEach(function (btn) {
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', function () { moPopup(btn.getAttribute('data-mo-popup')); });
  });

  /* ---------------------------------------------------------------- form gửi lời chúc */
  var form = document.querySelector('#FORM3 form');
  var nutGui = document.getElementById('BUTTON11');
  var dangGui = false;

  form.querySelectorAll('select').forEach(function (s) {
    s.addEventListener('change', function () { s.setAttribute('data-selected', s.value); });
  });
  nutGui.style.cursor = 'pointer';
  nutGui.addEventListener('click', function () {
    if (form.requestSubmit) form.requestSubmit();
    else form.querySelector('button[type=submit]').click();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (dangGui) return;
    var duLieu = new URLSearchParams();
    duLieu.append('ho_ten', form.elements.name.value.trim());
    duLieu.append('quan_he', form.elements.quan_he.value.trim());
    duLieu.append('loi_chuc', form.elements.message.value.trim());
    duLieu.append('tham_du', form.elements.tham_du.value);
    duLieu.append('khach_moi', tenKhachMoi() || '');
    duLieu.append('link', location.href);

    var xong = function () {
      dangGui = false;
      nutGui.style.opacity = '';
      form.reset();
      form.querySelectorAll('select').forEach(function (s) { s.setAttribute('data-selected', ''); });
      moPopup('POPUP2');
    };
    if (!CFG.linkGoogleSheet) {
      console.warn('Chưa có "Lời chúc - link Google Sheet" trong noi-dung.md: lời chúc không được lưu.');
      xong();
      return;
    }
    dangGui = true;
    nutGui.style.opacity = '0.6';
    fetch(CFG.linkGoogleSheet, { method: 'POST', mode: 'no-cors', body: duLieu })
      .then(xong)
      .catch(function () {
        dangGui = false;
        nutGui.style.opacity = '';
        alert('Gửi chưa được, bạn kiểm tra kết nối mạng rồi thử lại nhé!');
      });
  });

  /* ---------------------------------------------------------------- tên khách mời trong link (?khach=...) */
  function tenKhachMoi() {
    var p = new URLSearchParams(location.search);
    return (p.get('khach') || p.get('guest-name') || '').trim();
  }
  var khach = tenKhachMoi();
  if (khach) {
    document.querySelectorAll('[data-khach-moi]').forEach(function (el) { el.textContent = khach; });
  }

  /* ---------------------------------------------------------------- nút quà (QR mừng cưới) */
  var nutQua = document.getElementById('gift-icon');
  var qrPopup = document.getElementById('qr-popup');
  nutQua.addEventListener('click', function () {
    qrPopup.style.display = qrPopup.style.display === 'block' ? 'none' : 'block';
  });
  // Mỗi tài khoản (.qua-tk) có nút tải QR và chép số tài khoản riêng
  qrPopup.querySelectorAll('.qua-tk').forEach(function (tk, i) {
    tk.querySelector('[data-tai-qr]').addEventListener('click', function () {
      var a = document.createElement('a');
      a.href = tk.querySelector('img').src;
      a.download = 'QR-mung-cuoi-' + (i + 1) + (a.href.match(/\.\w+$/) || ['.png'])[0];
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    tk.querySelector('[data-sao-chep-stk]').addEventListener('click', function () {
      var stk = tk.querySelector('[data-stk]').innerText.trim();
      navigator.clipboard.writeText(stk).then(function () {
        alert('Đã sao chép STK: ' + stk);
      }, function () {
        alert('Không thể sao chép!');
      });
    });
  });

  /* ---------------------------------------------------------------- nhạc nền */
  var audio = document.getElementById('myAudio');
  var nutNhac = document.getElementById('toggleMusic');
  var nguoiDungTat = false; // khách chủ động bấm tắt nhạc thì không tự bật lại
  var CU_CHI = ['pointerdown', 'click', 'touchend', 'keydown'];
  // Trình duyệt chỉ cho phát nhạc sau một cử chỉ thật (bấm, chạm, gõ phím; di chuột/cuộn thì không tính).
  // Chỉ gỡ lắng nghe khi play() thành công, nếu bị chặn thì thử lại ở lần bấm/chạm sau.
  function tuPhatNhac(e) {
    if (nguoiDungTat || (e && nutNhac.contains(e.target))) return; // bấm vào nút loa thì để nút tự xử lý
    var p = audio.play();
    if (p && p.then) p.then(goLangNghe).catch(function () {});
    else goLangNghe();
  }
  function goLangNghe() {
    CU_CHI.forEach(function (ev) { document.removeEventListener(ev, tuPhatNhac, true); });
  }
  CU_CHI.forEach(function (ev) { document.addEventListener(ev, tuPhatNhac, true); });
  tuPhatNhac(); // một số trình duyệt cho phát luôn, không cần chờ
  function capNhatNutNhac() { nutNhac.textContent = audio.paused ? '🔈' : '🔊'; }
  audio.addEventListener('play', capNhatNutNhac);
  audio.addEventListener('pause', capNhatNutNhac);
  capNhatNutNhac();
  nutNhac.addEventListener('click', function () {
    if (audio.paused) { nguoiDungTat = false; audio.play().catch(function () {}); }
    else { nguoiDungTat = true; audio.pause(); }
  });

  batHieuUng();
  if ('requestIdleCallback' in window) requestIdleCallback(giaiMaTruocAnhAlbum, { timeout: 3000 });
  else setTimeout(giaiMaTruocAnhAlbum, 1500);
})();
