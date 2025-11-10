# Conversations API Documentation

## Endpoint: `GET /conversations.php`

**Base URL:** `https://admin.hebesbychloe.com/wp-content/themes/flatsome-child/backend-dfcflow/twilio/conversations.php`

**Description:** Lấy danh sách tất cả conversations (nhóm messages theo conversation_id hoặc phone number) với thông tin last message và contact.

---

## Request

### Method: `GET`

### Query Parameters:
- `senderPhone` (optional): Filter conversations by sender phone number (URL encoded, ví dụ: `%2B17144751339`)

### Headers:
- `Authorization: Bearer {token}` (optional): JWT token nếu cần authentication

### Example Request:
```
GET /conversations.php?senderPhone=%2B17144751339
```

---

## Response Format

### Success Response (200 OK):
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "conversationId": "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "phoneNumber": "+1234567890",
        "lastMessage": {
          "body": "Hello, this is the last message",
          "timestamp": "2024-01-01T12:00:00Z",
          "direction": "inbound"
        },
        "contact": {
          "id": "1",
          "name": "John Doe",
          "phone": "+1234567890",
          "email": "john@example.com",
          "created_at": "2024-01-01T00:00:00Z",
          "updated_at": "2024-01-01T00:00:00Z"
        },
        "senderPhones": ["+17144751339", "+19876543210"]
      }
    ]
  }
}
```

### Error Response:
```json
{
  "success": false,
  "data": "Error message"
}
```

---

## Response Fields

### Conversation Object:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversationId` | string | Yes | Conversation identifier - có thể là `conversation_id` từ database hoặc customer phone number (nếu không có conversation_id) |
| `phoneNumber` | string | Yes | Primary customer phone number (phone xuất hiện nhiều nhất trong conversation) |
| `lastMessage` | object | Yes | Thông tin message cuối cùng trong conversation |
| `contact` | object \| null | Yes | Contact information nếu có, null nếu không tìm thấy |
| `senderPhones` | string[] | Yes | Array các sender phone numbers liên quan đến conversation này |

### LastMessage Object:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `body` | string | Yes | Nội dung message |
| `timestamp` | string | Yes | ISO 8601 date string (ví dụ: "2024-01-01T12:00:00Z") |
| `direction` | string | Yes | "inbound" hoặc "outbound" |

### Contact Object (nếu có):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Contact ID |
| `name` | string | No | Contact name |
| `phone` | string | Yes | Contact phone number |
| `email` | string | No | Contact email |
| `created_at` | string | No | ISO 8601 date string |
| `updated_at` | string | No | ISO 8601 date string |

---

## Logic Implementation

### 1. Lấy Data từ Database

```php
// 1. Lấy tất cả active sender phone numbers
$senderPhones = $wpdb->get_results(
  "SELECT id, phone_number FROM twilio_sender_phone_numbers WHERE is_active = 1"
);

// 2. Lấy tất cả messages
$messages = $wpdb->get_results(
  "SELECT * FROM twilio_sms_messages ORDER BY created_at DESC"
);

// 3. Lấy tất cả contacts
$contacts = $wpdb->get_results(
  "SELECT * FROM contacts"
);
```

### 2. Group Messages by Conversation

**Quan trọng:** Messages được group theo thứ tự ưu tiên:
1. **Primary:** `conversation_id` - nếu có, tất cả messages cùng `conversation_id` phải được group lại
2. **Fallback:** Customer phone number - nếu không có `conversation_id`, dùng:
   - `from_number` nếu `direction = 'inbound'`
   - `to_number` nếu `direction = 'outbound'`

**Logic:**
```php
$messagesByConversation = [];
$lastMessages = [];
$conversationSenderPhones = [];
$conversationCustomerPhones = [];
$conversationPhoneCounts = [];

foreach ($messages as $message) {
  // Skip invalid messages
  if (empty($message->conversation_id) && empty($message->from_number) && empty($message->to_number)) {
    continue;
  }
  
  // Determine conversation key
  $conversationKey = $message->conversation_id 
    ?: ($message->direction === 'inbound' ? $message->from_number : $message->to_number);
  
  if (empty($conversationKey)) {
    continue;
  }
  
  // Determine customer phone
  $customerPhone = $message->direction === 'inbound' 
    ? $message->from_number 
    : $message->to_number;
  
  if (empty($customerPhone)) {
    continue;
  }
  
  // Initialize conversation if not exists
  if (!isset($messagesByConversation[$conversationKey])) {
    $messagesByConversation[$conversationKey] = [];
    $conversationSenderPhones[$conversationKey] = [];
    $conversationCustomerPhones[$conversationKey] = [];
    $conversationPhoneCounts[$conversationKey] = [];
  }
  
  // Add message to conversation
  $messagesByConversation[$conversationKey][] = $message;
  
  // Track customer phones
  if (!in_array($customerPhone, $conversationCustomerPhones[$conversationKey])) {
    $conversationCustomerPhones[$conversationKey][] = $customerPhone;
  }
  
  // Count phone occurrences
  $conversationPhoneCounts[$conversationKey][$customerPhone] = 
    ($conversationPhoneCounts[$conversationKey][$customerPhone] ?? 0) + 1;
  
  // Track sender phones
  if ($message->sender_phone_number_id) {
    // Find sender phone from sender_phone_number_id
    foreach ($senderPhones as $sp) {
      if ($sp->id == $message->sender_phone_number_id) {
        if (!in_array($sp->phone_number, $conversationSenderPhones[$conversationKey])) {
          $conversationSenderPhones[$conversationKey][] = $sp->phone_number;
        }
        break;
      }
    }
  } elseif ($message->direction === 'outbound' && in_array($message->from_number, $senderPhoneNumbers)) {
    if (!in_array($message->from_number, $conversationSenderPhones[$conversationKey])) {
      $conversationSenderPhones[$conversationKey][] = $message->from_number;
    }
  } elseif ($message->direction === 'inbound' && in_array($message->to_number, $senderPhoneNumbers)) {
    if (!in_array($message->to_number, $conversationSenderPhones[$conversationKey])) {
      $conversationSenderPhones[$conversationKey][] = $message->to_number;
    }
  }
  
  // Track last message (most recent by timestamp)
  $messageTime = strtotime($message->received_at ?: $message->sent_at ?: $message->created_at);
  if (!isset($lastMessages[$conversationKey]) || 
      $messageTime > strtotime($lastMessages[$conversationKey]['timestamp'])) {
    $lastMessages[$conversationKey] = [
      'body' => $message->body,
      'timestamp' => $message->received_at ?: $message->sent_at ?: $message->created_at,
      'direction' => $message->direction,
    ];
  }
}
```

### 3. Find Contact for Conversation

```php
// Build contacts map
$contactsMap = [];
foreach ($contacts as $contact) {
  if (empty($contact->phone)) {
    continue;
  }
  $contactsMap[$contact->phone] = $contact;
  // Also store without + prefix for matching
  if (!str_starts_with($contact->phone, '+')) {
    $contactsMap['+' . $contact->phone] = $contact;
  }
}

// Find contact for conversation
function findContactForConversation($customerPhones, $contactsMap) {
  foreach ($customerPhones as $phone) {
    if (empty($phone)) {
      continue;
    }
    
    // Try exact match
    if (isset($contactsMap[$phone])) {
      return $contactsMap[$phone];
    }
    
    // Try without + prefix
    $phoneWithoutPlus = str_starts_with($phone, '+') ? substr($phone, 1) : $phone;
    if (isset($contactsMap[$phoneWithoutPlus])) {
      return $contactsMap[$phoneWithoutPlus];
    }
  }
  return null;
}
```

### 4. Get Primary Customer Phone

```php
function getPrimaryCustomerPhone($conversationKey, $conversationCustomerPhones, $conversationPhoneCounts) {
  $customerPhones = $conversationCustomerPhones[$conversationKey] ?? [];
  
  if (empty($customerPhones)) {
    return $conversationKey;
  }
  
  // If only one phone, use it
  if (count($customerPhones) === 1) {
    return $customerPhones[0];
  }
  
  // Find the most common phone number
  $phoneCounts = $conversationPhoneCounts[$conversationKey] ?? [];
  $maxCount = 0;
  $primaryPhone = $customerPhones[0];
  
  foreach ($phoneCounts as $phone => $count) {
    if ($count > $maxCount) {
      $maxCount = $count;
      $primaryPhone = $phone;
    }
  }
  
  return $primaryPhone;
}
```

### 5. Build Conversations Array

```php
$conversations = [];

foreach ($messagesByConversation as $conversationKey => $messages) {
  // Skip empty conversations
  if (empty($messages)) {
    continue;
  }
  
  $customerPhones = $conversationCustomerPhones[$conversationKey] ?? [];
  $primaryCustomerPhone = getPrimaryCustomerPhone(
    $conversationKey, 
    $conversationCustomerPhones, 
    $conversationPhoneCounts
  );
  $contact = findContactForConversation($customerPhones, $contactsMap);
  
  $conversations[] = [
    'conversationId' => $conversationKey,
    'phoneNumber' => $primaryCustomerPhone,
    'lastMessage' => $lastMessages[$conversationKey] ?? null,
    'contact' => $contact,
    'senderPhones' => $conversationSenderPhones[$conversationKey] ?? [],
  ];
}
```

### 6. Sort by Last Message Timestamp

```php
usort($conversations, function($a, $b) {
  $timeA = strtotime($a['lastMessage']['timestamp'] ?? 0);
  $timeB = strtotime($b['lastMessage']['timestamp'] ?? 0);
  return $timeB - $timeA; // Descending (newest first)
});
```

### 7. Filter by Sender Phone (if provided)

```php
if (!empty($_GET['senderPhone'])) {
  $senderPhoneFilter = urldecode($_GET['senderPhone']);
  $conversations = array_filter($conversations, function($conv) use ($senderPhoneFilter) {
    return in_array($senderPhoneFilter, $conv['senderPhones']);
  });
  // Re-index array
  $conversations = array_values($conversations);
}
```

---

## Complete PHP Implementation Example

```php
<?php
/**
 * GET /conversations.php
 * Get all conversations with last message and contact info
 */

require_once($_SERVER['DOCUMENT_ROOT'] . '/wp-load.php');
require_once(__DIR__ . '/../utils/index.php');

global $wpdb;

setup_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  wp_send_json_error('Method not allowed', 405);
}

/* ---------- Helper Functions ---------- */

function jval($arr, $key, $def = null) {
  return is_array($arr) && array_key_exists($key, $arr) ? $arr[$key] : $def;
}

function findContactForConversation($customerPhones, $contactsMap) {
  foreach ($customerPhones as $phone) {
    if (empty($phone) || !is_string($phone)) {
      continue;
    }
    
    if (isset($contactsMap[$phone])) {
      return $contactsMap[$phone];
    }
    
    $phoneWithoutPlus = str_starts_with($phone, '+') ? substr($phone, 1) : $phone;
    if (!empty($phoneWithoutPlus) && isset($contactsMap[$phoneWithoutPlus])) {
      return $contactsMap[$phoneWithoutPlus];
    }
  }
  return null;
}

function getPrimaryCustomerPhone($conversationKey, $conversationCustomerPhones, $conversationPhoneCounts) {
  $customerPhones = $conversationCustomerPhones[$conversationKey] ?? [];
  
  if (empty($customerPhones)) {
    return $conversationKey;
  }
  
  if (count($customerPhones) === 1) {
    return $customerPhones[0];
  }
  
  $phoneCounts = $conversationPhoneCounts[$conversationKey] ?? [];
  $maxCount = 0;
  $primaryPhone = $customerPhones[0];
  
  foreach ($phoneCounts as $phone => $count) {
    if ($count > $maxCount) {
      $maxCount = $count;
      $primaryPhone = $phone;
    }
  }
  
  return $primaryPhone;
}

/* ---------- Get Data ---------- */

// Get active sender phone numbers
$senderPhones = $wpdb->get_results(
  "SELECT id, phone_number FROM twilio_sender_phone_numbers WHERE is_active = 1"
);
$senderPhoneNumbers = array_column($senderPhones, 'phone_number');
$senderPhoneIdMap = [];
foreach ($senderPhones as $sp) {
  $senderPhoneIdMap[$sp->id] = $sp->phone_number;
}

// Get all messages
$messages = $wpdb->get_results(
  "SELECT * FROM twilio_sms_messages ORDER BY created_at DESC"
);

// Get all contacts
$contacts = $wpdb->get_results("SELECT * FROM contacts");

/* ---------- Process Messages ---------- */

$messagesByConversation = [];
$lastMessages = [];
$conversationSenderPhones = [];
$conversationCustomerPhones = [];
$conversationPhoneCounts = [];

foreach ($messages as $message) {
  // Skip invalid messages
  if (empty($message->conversation_id) && empty($message->from_number) && empty($message->to_number)) {
    continue;
  }
  
  // Determine conversation key
  $conversationKey = $message->conversation_id 
    ?: ($message->direction === 'inbound' ? $message->from_number : $message->to_number);
  
  if (empty($conversationKey)) {
    continue;
  }
  
  // Determine customer phone
  $customerPhone = $message->direction === 'inbound' 
    ? $message->from_number 
    : $message->to_number;
  
  if (empty($customerPhone)) {
    continue;
  }
  
  // Initialize conversation
  if (!isset($messagesByConversation[$conversationKey])) {
    $messagesByConversation[$conversationKey] = [];
    $conversationSenderPhones[$conversationKey] = [];
    $conversationCustomerPhones[$conversationKey] = [];
    $conversationPhoneCounts[$conversationKey] = [];
  }
  
  // Add message
  $messagesByConversation[$conversationKey][] = $message;
  
  // Track customer phones
  if (!in_array($customerPhone, $conversationCustomerPhones[$conversationKey])) {
    $conversationCustomerPhones[$conversationKey][] = $customerPhone;
  }
  
  // Count phone occurrences
  $conversationPhoneCounts[$conversationKey][$customerPhone] = 
    ($conversationPhoneCounts[$conversationKey][$customerPhone] ?? 0) + 1;
  
  // Track sender phones
  if ($message->sender_phone_number_id && isset($senderPhoneIdMap[$message->sender_phone_number_id])) {
    $senderPhone = $senderPhoneIdMap[$message->sender_phone_number_id];
    if (!in_array($senderPhone, $conversationSenderPhones[$conversationKey])) {
      $conversationSenderPhones[$conversationKey][] = $senderPhone;
    }
  } elseif ($message->direction === 'outbound' && in_array($message->from_number, $senderPhoneNumbers)) {
    if (!in_array($message->from_number, $conversationSenderPhones[$conversationKey])) {
      $conversationSenderPhones[$conversationKey][] = $message->from_number;
    }
  } elseif ($message->direction === 'inbound' && in_array($message->to_number, $senderPhoneNumbers)) {
    if (!in_array($message->to_number, $conversationSenderPhones[$conversationKey])) {
      $conversationSenderPhones[$conversationKey][] = $message->to_number;
    }
  }
  
  // Track last message
  $messageTime = strtotime($message->received_at ?: $message->sent_at ?: $message->created_at ?: '1970-01-01');
  if (!isset($lastMessages[$conversationKey]) || 
      $messageTime > strtotime($lastMessages[$conversationKey]['timestamp'] ?? '1970-01-01')) {
    $lastMessages[$conversationKey] = [
      'body' => $message->body,
      'timestamp' => $message->received_at ?: $message->sent_at ?: $message->created_at,
      'direction' => $message->direction,
    ];
  }
}

/* ---------- Build Contacts Map ---------- */

$contactsMap = [];
foreach ($contacts as $contact) {
  if (empty($contact->phone)) {
    continue;
  }
  $contactsMap[$contact->phone] = $contact;
  if (!str_starts_with($contact->phone, '+')) {
    $contactsMap['+' . $contact->phone] = $contact;
  }
}

/* ---------- Build Conversations ---------- */

$conversations = [];

foreach ($messagesByConversation as $conversationKey => $messages) {
  if (empty($messages)) {
    continue;
  }
  
  $customerPhones = $conversationCustomerPhones[$conversationKey] ?? [];
  $primaryCustomerPhone = getPrimaryCustomerPhone(
    $conversationKey, 
    $conversationCustomerPhones, 
    $conversationPhoneCounts
  );
  $contact = findContactForConversation($customerPhones, $contactsMap);
  
  $conversations[] = [
    'conversationId' => $conversationKey,
    'phoneNumber' => $primaryCustomerPhone,
    'lastMessage' => $lastMessages[$conversationKey] ?? null,
    'contact' => $contact,
    'senderPhones' => $conversationSenderPhones[$conversationKey] ?? [],
  ];
}

/* ---------- Sort by Last Message Timestamp (newest first) ---------- */

usort($conversations, function($a, $b) {
  $timeA = strtotime($a['lastMessage']['timestamp'] ?? '1970-01-01');
  $timeB = strtotime($b['lastMessage']['timestamp'] ?? '1970-01-01');
  return $timeB - $timeA;
});

/* ---------- Filter by Sender Phone (if provided) ---------- */

$senderPhoneFilter = isset($_GET['senderPhone']) ? urldecode($_GET['senderPhone']) : null;
if ($senderPhoneFilter) {
  $conversations = array_filter($conversations, function($conv) use ($senderPhoneFilter) {
    return in_array($senderPhoneFilter, $conv['senderPhones']);
  });
  $conversations = array_values($conversations);
}

/* ---------- Response ---------- */

wp_send_json_success(['conversations' => $conversations]);
```

---

## Important Notes

1. **Conversation Grouping:**
   - Ưu tiên group theo `conversation_id` nếu có
   - Fallback về customer phone number nếu không có `conversation_id`
   - Tất cả messages cùng `conversation_id` PHẢI được group lại với nhau

2. **Primary Customer Phone:**
   - Là phone number xuất hiện nhiều nhất trong conversation
   - Nếu chỉ có 1 phone, dùng phone đó
   - Nếu không có phone nào, dùng `conversationKey`

3. **Last Message:**
   - Là message mới nhất (dựa trên `received_at`, `sent_at`, hoặc `created_at`)
   - Phải có đầy đủ: `body`, `timestamp`, `direction`

4. **Contact Matching:**
   - Tìm contact bằng cách match phone numbers
   - Hỗ trợ cả với và không có dấu `+`
   - Trả về `null` nếu không tìm thấy

5. **Sender Phones:**
   - Là array tất cả sender phone numbers liên quan đến conversation
   - Có thể lấy từ `sender_phone_number_id` hoặc từ `from_number`/`to_number`

6. **Sorting:**
   - Sort theo `lastMessage.timestamp` giảm dần (mới nhất trước)

7. **Filtering:**
   - Nếu có `senderPhone` query param, chỉ trả về conversations có sender phone đó trong `senderPhones` array

---

## Testing

Test với các cases:
1. Không có query param - trả về tất cả conversations
2. Có `senderPhone` - chỉ trả về conversations của sender phone đó
3. Conversations có `conversation_id` - group đúng
4. Conversations không có `conversation_id` - group theo phone number
5. Conversations có nhiều customer phones - chọn primary phone đúng
6. Conversations có contact - trả về contact info
7. Conversations không có contact - trả về `null`
8. Empty conversations - không trả về (filter out)

