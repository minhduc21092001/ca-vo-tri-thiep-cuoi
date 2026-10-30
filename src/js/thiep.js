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
    qrPopup.style.display = qrPopup.style.display === 'none' ? 'block' : 'none';
  });
  document.querySelector('[data-tai-qr]').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = document.getElementById('qr-img').src;
    a.download = 'QR-mung-cuoi' + (a.href.match(/\.\w+$/) || ['.png'])[0];
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
  document.querySelector('[data-sao-chep-stk]').addEventListener('click', function () {
    var stk = document.getElementById('stk-text').innerText.trim();
    navigator.clipboard.writeText(stk).then(function () {
      alert('Đã sao chép STK: ' + stk);
    }, function () {
      alert('Không thể sao chép!');
    });
  });

  /* ---------------------------------------------------------------- nhạc nền */
  var audio = document.getElementById('myAudio');
  var nutNhac = document.getElementById('toggleMusic');
  var daPhat = false;
  function phatNhac() {
    if (daPhat) return;
    daPhat = true;
    audio.play().catch(function (err) { console.log('Lỗi phát nhạc:', err); });
  }
  ['click', 'touchstart', 'mousemove', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, phatNhac, { once: true });
  });
  nutNhac.addEventListener('click', function () {
    if (audio.paused) { audio.play(); nutNhac.textContent = '🔊'; }
    else { audio.pause(); nutNhac.textContent = '🔈'; }
  });

  /* ---------------------------------------------------------------- nút cuộn xuống / lên */
  var nutCuon = document.getElementById('scrollBtn');
  var muiTen = nutCuon.querySelector('.arrow-icon');
  function oCuoiTrang() {
    return window.innerHeight + window.scrollY >= document.body.scrollHeight - 5;
  }
  nutCuon.addEventListener('click', function () {
    window.scrollTo({ top: oCuoiTrang() ? 0 : document.body.scrollHeight, behavior: 'smooth' });
  });
  var choKhungHinh = false;
  window.addEventListener('scroll', function () {
    if (choKhungHinh) return; // tối đa 1 lần mỗi khung hình
    choKhungHinh = true;
    requestAnimationFrame(function () {
      choKhungHinh = false;
      muiTen.classList.toggle('rotate-up', oCuoiTrang());
    });
  }, { passive: true });

  batHieuUng();
  if ('requestIdleCallback' in window) requestIdleCallback(giaiMaTruocAnhAlbum, { timeout: 3000 });
  else setTimeout(giaiMaTruocAnhAlbum, 1500);
})();
