# Hướng Dẫn Sinh Giọng Nói Thuyết Minh (Communes & Hamlets TTS Guide)

Hệ thống đã được nâng cấp để hỗ trợ phát âm thanh tĩnh chất lượng cao từ thư mục `audio/` bằng file `.mp3`. Tài liệu này hướng dẫn cách sử dụng file script [generate_audio.py](generate_audio.py) để tự động sinh giọng nói thuyết minh đồng bộ cho xã Cầu Kè và **19 ấp chuẩn bị thêm vào**.

---

## 1. Cơ Chế Hoạt Động Của Script `generate_audio.py`

Khi chạy, file script sẽ:
1. Quét toàn bộ các file `.geojson` và `.json` nằm trong thư mục `map data/`.
2. Duyệt qua từng đối tượng ranh giới bản đồ (features).
3. Đọc các thông tin thuộc tính (properties) để tự động xây dựng kịch bản thuyết minh tự nhiên bằng tiếng Việt.
4. Sử dụng công nghệ **Microsoft Azure Neural TTS** (giọng nữ trẻ trung, truyền cảm **`vi-VN-HoaiMyNeural`**) để chuyển văn bản thành file âm thanh.
5. Lưu file vào thư mục `audio/{ma}.mp3` (sử dụng mã số `ma` làm tên file).

---

## 2. Cách Định Dạng Thuộc Tính (Properties) Cho 19 Ấp Mới

Khi bạn thêm 19 file hoặc 19 đối tượng ấp mới vào bản đồ bằng GeoJSON, hãy cấu hình các trường thông tin trong đối tượng `properties` của từng ấp giống như mẫu sau để kịch bản thuyết minh tự động được sinh ra tối ưu nhất:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [...]
  },
  "properties": {
    "ma": "3005001",                              // BẮT BUỘC: Mã số ấp duy nhất (dùng để sinh file audio/3005001.mp3)
    "ten": "An Bình",                             // BẮT BUỘC: Tên ấp
    "loai": "Ấp",                                 // BẮT BUỘC: Ghi đúng chữ "Ấp" (hoặc Thôn, Tổ dân phố) để script nhận biết phân cấp
    "dien_tich_km2": "2.45",                     // TÙY CHỌN: Diện tích của ấp (dùng dấu chấm để ngăn decimal)
    "dan_so": "1850",                            // TÙY CHỌN: Dân số ấp (số lượng người)
    "mat_do_km2": "755.1",                       // TÙY CHỌN: Mật độ dân số
    "truong_ap": "Nguyễn Văn A",                  // TÙY CHỌN: Họ tên Trưởng ấp
    "bi_thu": "Trần Văn B"                       // TÙY CHỌN: Họ tên Bí thư chi bộ ấp (nếu không có trưởng ấp)
  }
}
```

### Cách script tự động thích ứng với thông tin của Ấp:
* **Tự động nhận diện phân cấp**: Khi `"loai"` là `"Ấp"`, script sẽ sinh lời chào phù hợp: *"Chào mừng bạn đến với ấp An Bình..."* thay vì là Xã.
* **Xử lý linh hoạt trường thiếu**: Nếu ấp đó không có số liệu diện tích hoặc dân số, script sẽ tự động bỏ qua phần đọc số liệu đó một cách tự nhiên mà không gây ra lỗi.
* **Trưởng ấp/Bí thư**: Script sẽ ưu tiên đọc họ tên Trưởng ấp trước, nếu không có sẽ đọc Bí thư ấp.

---

## 3. Hướng Dẫn Chạy Script Sinh Âm Thanh

Mỗi khi bạn cập nhật hoặc thêm file GeoJSON mới cho các ấp vào thư mục `map data/`, chỉ cần thực hiện 2 bước đơn giản sau:

### Bước 1: Mở PowerShell / Terminal tại thư mục dự án
```powershell
# Di chuyển đến thư mục dự án (nếu chưa có sẵn)
cd "d:\4. code\xa_cau_ke"
```

### Bước 2: Chạy lệnh sinh âm thanh
```powershell
python generate_audio.py
```

**Kết quả mong đợi:**
* Thư mục `audio/` sẽ được cập nhật các file `.mp3` mới (ví dụ: `audio/3005001.mp3`, `audio/3005002.mp3`,...).
* Toàn bộ giọng đọc của tất cả các ấp và xã sẽ hoàn toàn đồng bộ, sử cùng một chất giọng nữ trẻ trung cao cấp và có tốc độ đọc thống nhất.

---

## 4. Cách Front-end (`js/app.js`) Tự Động Nhận Diện Và Phát Âm Thanh

Phía Front-end JS đã được cấu hình hoàn hảo để tự động kết nối ranh giới bản đồ với âm thanh:
* Khi người dùng nhấp vào một ranh giới bất kỳ (dù là Xã hay Ấp), hệ thống sẽ lấy mã số `"ma"` trong thuộc tính của đối tượng đó để tìm và phát file `audio/{ma}.mp3` tương ứng.
* Bạn hoàn toàn không cần phải chỉnh sửa hay thêm bất kỳ dòng code JavaScript nào trong `app.js` khi thêm 19 ấp mới. Tất cả đều tự động liên kết bằng trường dữ liệu `"ma"`!
