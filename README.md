# Thiệp cưới online

Bản dựng lại thiệp mẫu `thiepmoionline.click/test78` dưới dạng website tĩnh. Bạn sửa nội dung trong **một file Markdown**, thay ảnh trong **thư mục `anh/`**, chạy một lệnh là có website để đăng.

## Cấu trúc thư mục

```
ca-vo-tri/
├── noi-dung.md            ← ✏️ TOÀN BỘ CHỮ TRÊN THIỆP (tên, ngày, địa chỉ, tài khoản…)
├── anh/                   ← 🖼️ ẢNH
│   ├── anh-cuoi/          ảnh cưới ở các vị trí cố định (bìa, cạnh nhà trai/gái, thư mời, lịch…)
│   ├── album/             13 ảnh của phần "Album ảnh cưới", 01.jpg → 13.jpg
│   ├── mung-cuoi/         ảnh QR ngân hàng (tài khoản 1, tài khoản 2)
│   └── trang-tri/         hoa văn, nền, chibi, cửa mở đầu trang… (ít khi cần đổi)
├── nhac/nhac-nen.mp3      ← 🎵 nhạc nền
├── google-sheet/          ← lưu lời chúc của khách vào Google Sheet (xem HUONG-DAN.md trong đó)
├── src/                   ← khung thiệp (HTML/CSS/JS, phông chữ). Không cần sửa.
│   ├── thiep.html         khung trang thiệp, các chỗ {{…}} lấy chữ từ noi-dung.md
│   ├── tao-link.html      trang tạo link
│   ├── css/  js/  fonts/
├── build.js               ← ghép noi-dung.md + ảnh + khung → thư mục website/
└── website/               ← KẾT QUẢ để đăng lên mạng (tự tạo, đừng sửa tay)
```

## Cần có

[Node.js](https://nodejs.org) bản 18 trở lên. Không cần cài thêm gì (`npm install` cũng không cần).

## Sửa thiệp

1. Mở terminal trong thư mục này, chạy:

   ```
   npm run dev
   ```

2. Mở <http://localhost:8080/> để xem thiệp, <http://localhost:8080/tao-link/> để tạo link.
3. Sửa `noi-dung.md` hoặc chép ảnh mới vào `anh/`, lưu lại rồi **tải lại trang** là thấy thay đổi.

**Đổi ảnh:** chép ảnh của bạn đè lên file cũ, **giữ nguyên tên file** (ví dụ thay `anh/album/05.jpg`). Nếu ảnh của bạn tên khác hoặc là `.png`, sửa đường dẫn tương ứng ở mục 12 trong `noi-dung.md`. Ảnh tự cắt giữa cho vừa khung; nên dùng ảnh dọc, rộng khoảng 800–1200px để trang tải nhanh.

**Lịch:** chỉ cần điền tháng, năm và ngày cưới ở mục 7, lịch và trái tim tự vẽ lại.

**Tài khoản mừng cưới:** mẫu gốc chứa số tài khoản và QR của người khác nên đã được thay bằng chữ giữ chỗ. Nhớ điền tài khoản của bạn ở mục 10 và chép ảnh QR vào `anh/mung-cuoi/`.

## Tạo link cho khách

Mở trang `…/tao-link/` trên website của bạn, điền rồi bấm **Tạo link**:

- **Tiêu đề link**: ví dụ "Anh Minh và gia đình" → link ngắn `https://ten-mien.vn/anh-minh-va-gia-dinh`. Khi gửi qua Zalo/Messenger, khung xem trước hiện "💍 Thiệp cưới … – **Mời** Anh Minh và gia đình" (nếu bạn đã gõ chữ "Mời" ở đầu thì không lặp lại). Mọi link đều mở cùng một tấm thiệp.
- **Tên khách mời** (không bắt buộc): hiện ở dòng dưới chữ "Thư Mời" và trên màn hình mở thiệp.
- Link vừa tạo tự lưu vào danh sách bên dưới (danh sách chỉ lưu trên trình duyệt bạn đang dùng).

Link ngắn hoạt động nhờ `netlify/edge-functions/link-ngan.js`: máy chủ Netlify nhớ tiêu đề và tên khách của từng link (lưu trong Netlify Blobs) để chèn vào thiệp. Vì vậy cần **deploy qua Git trên Netlify** (kéo thả thư mục `website/` sẽ không có chức năng này, trang tạo link sẽ tạm dùng link dài có `?khach=...`). Muốn chỉ mình bạn tạo được link: vào Netlify → *Site configuration → Environment variables*, thêm biến `MAT_KHAU_TAO_LINK` với mật khẩu tuỳ chọn; trang tạo link sẽ hỏi mật khẩu ở lần đầu.

## Đăng lên mạng

Chạy `npm run build`, rồi đăng **thư mục `website/`**. Các cách dưới đây đều đã được cấu hình sẵn để link tuỳ ý (`/moi-anh-minh`) vẫn mở ra thiệp:

| Nơi đăng | Cách làm |
|---|---|
| **Netlify** (dễ nhất) | Vào <https://app.netlify.com/drop>, kéo thả thư mục `website/` vào. Muốn dùng Git: kết nối repo, Netlify tự đọc `netlify.toml`. |
| **Cloudflare Pages** | Tạo project → *Upload assets* → chọn thư mục `website/`. |
| **Vercel** | `npx vercel website --prod` |
| **GitHub Pages** | Đưa nội dung `website/` lên nhánh/thư mục được publish. Nếu địa chỉ có dạng `ten.github.io/ten-repo/`, sửa `Đường dẫn gốc: /ten-repo/` trong `noi-dung.md`. Lưu ý: GitHub Pages trả link tuỳ ý qua trang 404 nên ảnh xem trước khi gửi qua Zalo/Messenger có thể không hiện. |

Sau khi có tên miền, sửa `Địa chỉ website` ở mục 13 trong `noi-dung.md` và build lại: ảnh xem trước khi chia sẻ link cần địa chỉ này.

## Đã bỏ so với mẫu gốc

- Icon Facebook, Instagram, TikTok ở chân trang và tên đơn vị làm thiệp.
- Thư viện và mã theo dõi của LadiPage (không còn gửi dữ liệu về LadiPage, form lời chúc không gửi về tài khoản của người khác).
- Thông tin ngân hàng và ảnh QR của người khác trong mẫu.
- Bộ ảnh trượt (gallery) bị ẩn ngoài màn hình ở mẫu gốc.

Ảnh cưới, phông chữ và nhạc nền hiện là của mẫu gốc (studio MIMOSA, bài "Beautiful In White"). Hãy thay bằng ảnh và nhạc của bạn trước khi gửi thiệp.
