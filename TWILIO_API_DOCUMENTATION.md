# Twilio API PHP Backend Documentation

Tài liệu này mô tả các API endpoints PHP cần được tạo để thay thế các Twilio test endpoints hiện tại.

**Base URL:** `https://admin.hebesbychloe.com/wp-content/themes/flatsome-child/backend-dfcflow/twilio`

**Authentication:** Tất cả requests cần JWT token trong header `Authorization: Bearer {token}`

**Response Format:** Tất cả responses đều theo format:
```json
{
  "success": true,
  "data": { ... }
}
```

Hoặc khi có lỗi:
```json
{
  "success": false,
  "data": "Error message" hoặc { "error": "Error message", "code": 400 }
}
```

---

## 1. Create Conversation

**Endpoint:** `POST /create_conversation.php`

**Description:** Tạo một Twilio conversation mới

### Request Body:
```json
{
  "account_id": "string (required)",
  "friendly_name": "string (optional)",
  "conversation_service_sid": "string (optional)"
}
```

**Note:** `account_id` được dùng để lấy `account_sid` và `auth_token` từ database `twilio_sender_accounts`

### Response (Success):
```json
{
  "success": true,
  "data": {
    "sid": "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "chat_service_sid": "ISxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "friendly_name": "Conversation with +1234567890",
    "unique_name": null,
    "attributes": "{}",
    "state": "active",
    "date_created": "2024-01-01T00:00:00Z",
    "date_updated": "2024-01-01T00:00:00Z",
    "url": "https://conversations.twilio.com/v1/Conversations/CH..."
  }
}
```

### Response (Error):
```json
{
  "success": false,
  "data": {
    "error": "Error message",
    "code": 20001,
    "status": 400
  }
}
```

---

## 2. List Conversations

**Endpoint:** `GET /list_conversations.php`

**Description:** Liệt kê tất cả conversations (có thể filter theo service)

### Query Parameters:
- `account_id` (required): Account ID để lấy credentials
- `conversation_service_sid` (optional): Filter theo service SID
- `limit` (optional): Số lượng conversations tối đa (default: 20)

### Request Example:
```
GET /list_conversations.php?account_id=123&limit=50&conversation_service_sid=IS...
```

### Response (Success):
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "sid": "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "chat_service_sid": "ISxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "friendly_name": "Conversation with +1234567890",
        "unique_name": null,
        "attributes": "{}",
        "state": "active",
        "date_created": "2024-01-01T00:00:00Z",
        "date_updated": "2024-01-01T00:00:00Z",
        "url": "https://conversations.twilio.com/v1/Conversations/CH..."
      }
    ],
    "meta": {
      "page": 0,
      "page_size": 50,
      "first_page_url": "...",
      "previous_page_url": null,
      "url": "...",
      "next_page_url": null,
      "key": "conversations"
    }
  }
}
```

---

## 3. Find Conversation by Phone

**Endpoint:** `GET /find_conversation_by_phone.php`

**Description:** Tìm conversations theo số điện thoại của participant

### Query Parameters:
- `account_id` (required): Account ID để lấy credentials
- `phone_number` (required): Số điện thoại cần tìm (phải có country code, ví dụ: +1234567890)
- `conversation_service_sid` (optional): Tìm trong một service cụ thể
- `limit` (optional): Số lượng conversations tối đa để check (default: 100)

### Request Example:
```
GET /find_conversation_by_phone.php?account_id=123&phone_number=%2B1234567890&limit=50
```

### Response (Success):
```json
{
  "success": true,
  "data": {
    "found": 1,
    "conversations": [
      {
        "sid": "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "chat_service_sid": "ISxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "friendly_name": "Conversation with +1234567890",
        "participants": [
          {
            "sid": "MBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            "address": "+1234567890",
            "proxy_address": "+19876543210"
          }
        ]
      }
    ]
  }
}
```

---

## 4. Get Conversation

**Endpoint:** `GET /get_conversation.php`

**Description:** Lấy thông tin chi tiết của một conversation

### Query Parameters:
- `account_id` (required): Account ID để lấy credentials
- `conversation_sid` (required): Conversation SID cần lấy
- `conversation_service_sid` (optional): Service SID (chỉ để reference)

### Request Example:
```
GET /get_conversation.php?account_id=123&conversation_sid=CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Response (Success):
```json
{
  "success": true,
  "data": {
    "sid": "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "chat_service_sid": "ISxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "friendly_name": "Conversation with +1234567890",
    "unique_name": null,
    "attributes": "{}",
    "state": "active",
    "date_created": "2024-01-01T00:00:00Z",
    "date_updated": "2024-01-01T00:00:00Z",
    "url": "https://conversations.twilio.com/v1/Conversations/CH..."
  }
}
```

---

## 5. Add Participant

**Endpoint:** `POST /add_participant.php`

**Description:** Thêm một participant vào conversation

### Request Body:
```json
{
  "account_id": "string (required)",
  "conversation_sid": "string (required)",
  "address": "string (required)",
  "proxy_address": "string (required)",
  "conversation_service_sid": "string (optional)"
}
```

**Fields:**
- `address`: Số điện thoại của participant (customer)
- `proxy_address`: Số điện thoại của sender (Twilio number - sẽ là FROM number)

### Response (Success):
```json
{
  "success": true,
  "data": {
    "sid": "MBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "conversation_sid": "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "identity": null,
    "attributes": "{}",
    "messaging_binding": {
      "type": "sms",
      "address": "+1234567890",
      "proxy_address": "+19876543210"
    },
    "role_sid": "RLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "date_created": "2024-01-01T00:00:00Z",
    "date_updated": "2024-01-01T00:00:00Z",
    "url": "https://conversations.twilio.com/v1/Conversations/CH.../Participants/MB..."
  }
}
```

### Response (Error - Participant already exists):
```json
{
  "success": false,
  "data": {
    "error": "Participant already exists",
    "code": 409,
    "status": 409
  }
}
```

**Note:** Nếu participant đã tồn tại (HTTP 409), có thể coi là success và return thông tin participant hiện có.

---

## 6. List Participants

**Endpoint:** `GET /list_participants.php`

**Description:** Liệt kê tất cả participants trong một conversation

### Query Parameters:
- `account_id` (required): Account ID để lấy credentials
- `conversation_sid` (required): Conversation SID
- `conversation_service_sid` (optional): Service SID (chỉ để reference)

### Request Example:
```
GET /list_participants.php?account_id=123&conversation_sid=CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Response (Success):
```json
{
  "success": true,
  "data": {
    "participants": [
      {
        "sid": "MBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "conversation_sid": "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "identity": null,
        "attributes": "{}",
        "messaging_binding": {
          "type": "sms",
          "address": "+1234567890",
          "proxy_address": "+19876543210"
        },
        "role_sid": "RLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "date_created": "2024-01-01T00:00:00Z",
        "date_updated": "2024-01-01T00:00:00Z",
        "url": "https://conversations.twilio.com/v1/Conversations/CH.../Participants/MB..."
      }
    ],
    "meta": {
      "page": 0,
      "page_size": 50,
      "first_page_url": "...",
      "previous_page_url": null,
      "url": "...",
      "next_page_url": null,
      "key": "participants"
    }
  }
}
```

---

## 7. Send Message via Conversation

**Endpoint:** `POST /send_message.php`

**Description:** Gửi message qua conversation

### Request Body:
```json
{
  "account_id": "string (required)",
  "conversation_sid": "string (required)",
  "body": "string (required)",
  "author": "string (optional)",
  "conversation_service_sid": "string (optional)"
}
```

**Fields:**
- `body`: Nội dung message
- `author`: Số điện thoại của người gửi (optional, nếu không có sẽ dùng default)

### Response (Success):
```json
{
  "success": true,
  "data": {
    "sid": "IMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "conversation_sid": "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "index": 0,
    "author": "+19876543210",
    "body": "Hello, this is a test message",
    "attributes": "{}",
    "date_created": "2024-01-01T00:00:00Z",
    "date_updated": "2024-01-01T00:00:00Z",
    "url": "https://conversations.twilio.com/v1/Conversations/CH.../Messages/IM..."
  }
}
```

---

## 8. List Messages

**Endpoint:** `GET /list_messages.php`

**Description:** Liệt kê messages trong một conversation

### Query Parameters:
- `account_id` (required): Account ID để lấy credentials
- `conversation_sid` (required): Conversation SID
- `limit` (optional): Số lượng messages tối đa (default: 20)
- `conversation_service_sid` (optional): Service SID (chỉ để reference)

### Request Example:
```
GET /list_messages.php?account_id=123&conversation_sid=CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&limit=50
```

### Response (Success):
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "sid": "IMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "conversation_sid": "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "index": 0,
        "author": "+19876543210",
        "body": "Hello, this is a test message",
        "attributes": "{}",
        "date_created": "2024-01-01T00:00:00Z",
        "date_updated": "2024-01-01T00:00:00Z",
        "url": "https://conversations.twilio.com/v1/Conversations/CH.../Messages/IM..."
      }
    ],
    "meta": {
      "page": 0,
      "page_size": 50,
      "first_page_url": "...",
      "previous_page_url": null,
      "url": "...",
      "next_page_url": null,
      "key": "messages"
    }
  }
}
```

---

## 9. List Conversation Services

**Endpoint:** `GET /list_services.php`

**Description:** Liệt kê tất cả conversation services

### Query Parameters:
- `account_id` (required): Account ID để lấy credentials
- `conversation_service_sid` (optional): Không được sử dụng, chỉ để reference

### Request Example:
```
GET /list_services.php?account_id=123
```

### Response (Success):
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "sid": "ISxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "friendly_name": "Default Conversations Service",
        "date_created": "2024-01-01T00:00:00Z",
        "date_updated": "2024-01-01T00:00:00Z",
        "url": "https://conversations.twilio.com/v1/Services/IS..."
      }
    ],
    "meta": {
      "page": 0,
      "page_size": 50,
      "first_page_url": "...",
      "previous_page_url": null,
      "url": "...",
      "next_page_url": null,
      "key": "services"
    }
  }
}
```

---

## 10. Remove Participant

**Endpoint:** `DELETE /remove_participant.php`

**Description:** Xóa một participant khỏi conversation

### Request Body:
```json
{
  "account_id": "string (required)",
  "conversation_sid": "string (required)",
  "participant_sid": "string (required)",
  "conversation_service_sid": "string (optional)"
}
```

### Response (Success):
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "participant_sid": "MBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

### Response (Error):
```json
{
  "success": false,
  "data": {
    "error": "Participant not found",
    "code": 404,
    "status": 404
  }
}
```

---

## 11. Delete Message

**Endpoint:** `DELETE /delete_message.php`

**Description:** Xóa một message khỏi conversation

### Request Body:
```json
{
  "account_id": "string (required)",
  "conversation_sid": "string (required)",
  "message_sid": "string (required)",
  "conversation_service_sid": "string (optional)"
}
```

### Response (Success):
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "message_sid": "IMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

### Response (Error):
```json
{
  "success": false,
  "data": {
    "error": "Message not found",
    "code": 404,
    "status": 404
  }
}
```

---

## 12. Delete Conversation

**Endpoint:** `DELETE /delete_conversation.php`

**Description:** Xóa một hoặc nhiều conversations (permanent - không thể undo). Có thể xóa nhiều conversations bằng cách truyền comma-separated list.

### Request Body:
```json
{
  "account_id": "string (required)",
  "conversation_sid": "string (required)",
  "conversation_service_sid": "string (optional)"
}
```

**Note:** `conversation_sid` có thể là:
- Single SID: `"CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`
- Multiple SIDs (comma-separated): `"CH1,CH2,CH3"`

### Response (Success - Single):
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "conversation_sid": "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

### Response (Success - Multiple):
```json
{
  "success": true,
  "data": {
    "deleted": 3,
    "conversation_sids": [
      "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "CHyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
      "CHzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"
    ],
    "failed": []
  }
}
```

### Response (Partial Success):
```json
{
  "success": true,
  "data": {
    "deleted": 2,
    "conversation_sids": [
      "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "CHyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
    ],
    "failed": [
      {
        "sid": "CHzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
        "error": "Conversation not found",
        "code": 404
      }
    ]
  }
}
```

---

## Common Implementation Notes

### 1. Authentication & Credentials
- Tất cả endpoints nhận `account_id` (không phải `account_sid` và `auth_token` trực tiếp)
- Sử dụng `account_id` để query từ bảng `twilio_sender_accounts`:
  ```sql
  SELECT account_sid, auth_token FROM twilio_sender_accounts WHERE id = ?
  ```
- Sử dụng `account_sid` và `auth_token` để authenticate với Twilio API

### 2. Error Handling
- Luôn return format `{ "success": false, "data": { "error": "...", "code": ..., "status": ... } }`
- HTTP status code nên match với Twilio error code khi có thể
- Log errors để debug

### 3. CORS Headers
- Tất cả endpoints cần setup CORS headers (giống như `send_sms.php`)
- Sử dụng function `setup_cors_headers()` nếu có sẵn

### 4. Request Validation
- Validate tất cả required fields
- Validate format của SIDs (CH..., MB..., IM..., IS...)
- Validate phone number format (phải có + và country code)

### 5. Twilio API Calls
- Sử dụng cURL với Basic Auth (giống như `send_sms.php`)
- Endpoint base: `https://conversations.twilio.com/v1/`
- Format: `{account_sid}:{auth_token}` cho Basic Auth

### 6. Response Format
- Luôn wrap response trong `{ "success": true/false, "data": ... }`
- Giữ nguyên structure của Twilio response trong `data`
- Thêm `meta` object cho paginated responses (list endpoints)

---

## Example PHP Structure

```php
<?php
/**
 * Example: create_conversation.php
 */

require_once($_SERVER['DOCUMENT_ROOT'] . '/wp-load.php');
require_once(__DIR__ . '/../utils/index.php');

global $wpdb;

setup_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  wp_send_json_error('Method not allowed', 405);
}

// Read & decode body
$raw = file_get_contents('php://input');
if (!$raw) wp_send_json_error('Empty body', 400);

$body = json_decode($raw, true);
if (!is_array($body)) wp_send_json_error('Invalid JSON', 400);

// Extract inputs
$account_id = trim((string) ($body['account_id'] ?? ''));
$friendly_name = trim((string) ($body['friendly_name'] ?? ''));
$conversation_service_sid = trim((string) ($body['conversation_service_sid'] ?? ''));

// Validation
if (empty($account_id)) {
  wp_send_json_error('Missing required field: account_id', 400);
}

// Get Twilio credentials from database
$acc = $wpdb->get_row($wpdb->prepare(
  "SELECT account_sid, auth_token FROM twilio_sender_accounts WHERE id = %s LIMIT 1",
  $account_id
));

if (!$acc || empty($acc->account_sid) || empty($acc->auth_token)) {
  wp_send_json_error('Account not found or credentials missing', 404);
}

// Call Twilio API
$tw_endpoint = "https://conversations.twilio.com/v1/Conversations";
$tw_fields = [];
if ($friendly_name) {
  $tw_fields['FriendlyName'] = $friendly_name;
}

list($resp_raw, $resp_err, $resp_code) = http_post_basic_auth(
  $tw_endpoint,
  $acc->account_sid,
  $acc->auth_token,
  $tw_fields
);

if ($resp_err || $resp_code < 200 || $resp_code >= 300) {
  $error_data = json_decode($resp_raw, true);
  wp_send_json_error([
    'error' => $error_data['message'] ?? 'Twilio API error',
    'code' => $error_data['code'] ?? $resp_code,
    'status' => $resp_code
  ], $resp_code);
}

$tw_json = json_decode($resp_raw, true);
wp_send_json_success($tw_json);
```

---

## Testing

Sau khi implement, test từng endpoint với:
1. Valid inputs
2. Missing required fields
3. Invalid account_id
4. Invalid SIDs
5. Invalid phone numbers
6. Network errors (Twilio API down)

Tất cả endpoints nên return consistent format và handle errors gracefully.

