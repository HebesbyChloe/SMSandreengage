# Test Checklist - Hebes Backend API Integration

## 🧪 Test Local Server

Server đang chạy tại: `http://localhost:3000`

---

## ✅ Checklist Test

### 1. **Login & Authentication**
- [ ] Mở `http://localhost:3000`
- [ ] Login với credentials hợp lệ
- [ ] Kiểm tra user profile hiển thị ở header
- [ ] Kiểm tra JWT token được lưu trong localStorage

### 2. **Sync Phone Numbers** (Quan trọng nhất)
- [ ] Vào trang **Accounts** (`/sms` → tab Accounts)
- [ ] Chọn một sender account đã có
- [ ] Click nút **"Sync Phones"**
- [ ] Kiểm tra console log:
  ```
  🔄 Syncing phone numbers for account: [accountId]
  📡 Calling Hebes Backend API: sender_numbers_sync.php
  ✅ Sync complete: { fetched, inserted, updated, deactivated }
  ```
- [ ] Kiểm tra phone numbers được hiển thị trong list
- [ ] Kiểm tra response từ Hebes Backend API có đúng format không

**Expected Response:**
```json
{
  "phoneNumbers": [...],
  "success": true,
  "summary": {
    "fetched_from_twilio": 5,
    "inserted": 2,
    "updated": 2,
    "deactivated": 1
  }
}
```

### 3. **Send SMS** (Quan trọng nhất)
- [ ] Vào trang **Messages** (`/sms` → tab Messages)
- [ ] Chọn một conversation hoặc tạo mới
- [ ] Gửi một tin nhắn test
- [ ] Kiểm tra console log:
  ```
  📞 Conversation ID for [phone]: [id]
  📡 Calling Hebes Backend API: send_sms.php
  ✅ SMS sent successfully: { messageSid, status }
  ```
- [ ] Kiểm tra tin nhắn xuất hiện trong conversation
- [ ] Kiểm tra response từ Hebes Backend API

**Expected Response:**
```json
{
  "success": true,
  "messageSid": "SMxxxxx",
  "status": "sent",
  "localMessage": {...}
}
```

### 4. **Error Handling**
- [ ] Test sync với account không có credentials → Kiểm tra error message
- [ ] Test send SMS với số điện thoại không hợp lệ → Kiểm tra validation error
- [ ] Test send SMS với account inactive → Kiểm tra error message

---

## 🔍 Kiểm tra Network Requests

Mở **Browser DevTools** → **Network** tab:

### Sync Phones Request:
```
POST /api/sender-accounts/[id]/sync-phones
→ Gọi: https://admin.hebesbychloe.com/.../twilio/sender_numbers_sync.php
```

### Send SMS Request:
```
POST /api/twilio/send
→ Gọi: https://admin.hebesbychloe.com/.../twilio/send_sms.php
```

**Kiểm tra:**
- [ ] Request có `Authorization: Bearer [token]` header
- [ ] Request body đúng format
- [ ] Response status code (200 = success)
- [ ] Response data đúng format

---

## ⚠️ Common Issues

### Issue 1: CORS Error
**Symptom:** `Access-Control-Allow-Origin` error
**Solution:** Kiểm tra Hebes Backend có cho phép CORS từ localhost không

### Issue 2: 404 Not Found
**Symptom:** `404` khi gọi Hebes Backend API
**Solution:** Kiểm tra URL endpoint có đúng không:
- `sender_numbers_sync.php` (không phải `/api/twilio/sender_numbers_sync.php`)
- `send_sms.php` (không phải `/api/twilio/send_sms.php`)

### Issue 3: 401 Unauthorized
**Symptom:** `401` khi gọi Hebes Backend API
**Solution:** Kiểm tra JWT token có được gửi trong header không

### Issue 4: Invalid JSON Response
**Symptom:** `Invalid JSON response` error
**Solution:** Kiểm tra Hebes Backend có trả về JSON đúng format không

---

## 📝 Test Results

Sau khi test, ghi lại kết quả:

- [ ] Sync Phones: ✅ / ❌
- [ ] Send SMS: ✅ / ❌
- [ ] Error Handling: ✅ / ❌
- [ ] Network Requests: ✅ / ❌

**Notes:**
```
[Ghi chú về các lỗi gặp phải hoặc điều cần lưu ý]
```

---

## 🚀 Sau khi test local thành công

Nếu tất cả test đều pass, có thể deploy lên Vercel:

```bash
vercel deploy --prod
```

