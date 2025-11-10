# SMS Send Flow Documentation

This document describes the complete flow of what happens when a user sends an SMS message through the application.

## User Flow Overview

When a user navigates to the SMS page, adds a new message, enters a phone number and message, then clicks send, the following flow occurs:

## 1. Page Navigation (`/sms`)

**File:** `app/sms/page.tsx`

- User lands on `/sms` page
- Component renders `ChatPage` when `activeTab === 'chat'`
- `ChatPage` displays conversation list and message thread interface

## 2. Adding New Message

**File:** `src/components/pages/ChatPage.tsx` (line 285)

- User clicks "New Message" button
- Sets `showNewMessage` state to `true`
- Renders `NewMessagePanel` component

**File:** `src/components/modules/NewMessagePanel.tsx`

- User can:
  - Search/select contact or type phone number (lines 17-24, 61-72)
  - Type message text (lines 18, 201-210)
  - Optionally select sender phone number (lines 89-91)

## 3. Form Submission (Send Button Clicked)

**File:** `src/components/modules/NewMessagePanel.tsx` (lines 74-101)

### Frontend Logic:

1. **Validation** (line 77): Checks `phoneNumber` and `message` are not empty
2. **Payload Construction** (lines 83-91):
   ```typescript
   {
     to: phoneNumber.trim(),
     message: message.trim(),
     from: defaultSenderPhone (optional)
   }
   ```

3. **API Call** (line 93): `await apiPost('/send-sms', payload)`

## 4. API Request (`/api/send-sms`)

**File:** `app/api/send-sms/route.ts`

### Step-by-Step Processing:

#### 4.1 Request Parsing (lines 12-18)

- Extracts JWT token from request headers
- Parses JSON body: `{ to, from, message }`
- Validates required fields

#### 4.2 Sender Phone Number Lookup (lines 20-57)

- Formats `from` number using `formatPhoneNumber()`
- Fetches all sender phone numbers: `hebesSenderPhoneNumbers.getAll(token)`
- Finds matching phone number by comparing formatted numbers
- Retrieves `senderPhoneNumberId` and `account_id`

#### 4.3 Phone Number Formatting (lines 65-66)

- Formats `to` number: `formatPhoneNumber(to)`
- `from` number already formatted in step 4.2

#### 4.4 Twilio Conversation Management (lines 68-85)

- Calls `findOrCreateTwilioConversation()`:
  - **File:** `src/lib/twilio/conversations.ts` (lines 13-258)
  - Searches existing messages for Twilio Conversation SID (starts with "CH")
  - If found: verifies participants exist
  - If not found: creates new Twilio Conversation via Twilio API
  - Adds recipient as participant with proxy address
- Also calls `findOrCreateConversationId()`:
  - **File:** `src/lib/conversations.ts` (lines 13-69)
  - Finds existing local conversation ID from database
  - Returns conversation_id from existing messages or null

#### 4.5 Prepare Send Data (lines 87-108)

- Constructs `sendData` object:
  ```typescript
  {
    account_id: phoneData.account_id,
    to_number: formattedTo,
    from_number: formattedFrom,
    body: message,
    sender_phone_number_id: senderPhoneNumberId,
    status_callback: `${appUrl}/api/twilio/status`,
    conversation_sid: twilioConversationSid || localConversationId (optional)
  }
  ```

#### 4.6 Call Hebes Backend API (line 114)

- **File:** `src/lib/hebes-api.ts` (lines 294-358)
- Function: `hebesSendSMS(sendData, token)`
- Endpoint: `https://admin.hebesbychloe.com/.../twilio/send_sms_test.php`
- Method: POST
- Headers: `Authorization: Bearer {token}`
- Body: JSON with send data

#### 4.7 Response Processing (lines 116-146)

- Receives response from Hebes API:
  ```typescript
  {
    success: true,
    data: {
      twilio_response: {
        parsed: {
          sid: string,      // Twilio message SID
          status: string,    // e.g., "queued", "sent"
          date_created: string
        }
      },
      local_message: {
        id: string          // Database message ID
      }
    }
  }
  ```

#### 4.8 Update Conversation ID (lines 123-146)

- If message was created successfully:
  - Updates message record with `conversation_id`
  - Uses `twilioConversationSid` or `localConversationId`
  - Calls: `hebesSmsMessages.update({ id, conversation_id }, token)`

#### 4.9 Return Response (lines 148-153)

- Returns JSON response:
  ```typescript
  {
    success: true,
    messageSid: string,
    status: string,
    localMessage: object
  }
  ```

## 5. Frontend Response Handling

**File:** `src/components/modules/NewMessagePanel.tsx` (lines 95-100)

- On success: Calls `onSent(phoneNumber.trim())`
- On error: Displays error message to user
- **File:** `src/components/pages/ChatPage.tsx` (lines 67-84)
  - `handleNewConversation()` is called
  - Closes new message panel
  - Selects conversation or creates temporary conversation object
  - Reloads conversations list

## 6. Message Status Updates

**File:** `app/api/twilio/status/route.ts` (if exists)

- Twilio calls status callback URL with delivery status
- Updates message status in database

## Key API Endpoints

1. **Frontend → Next.js API:**
   - `POST /api/send-sms` - Main send endpoint

2. **Next.js API → Hebes Backend:**
   - `POST https://admin.hebesbychloe.com/.../twilio/send_sms_test.php`
   - `GET https://admin.hebesbychloe.com/.../twilio/sender_phone_numbers.php`
   - `GET https://admin.hebesbychloe.com/.../twilio/sms_messages.php`
   - `PUT https://admin.hebesbychloe.com/.../twilio/sms_messages.php` (update conversation_id)

3. **Next.js API → Twilio API:**
   - `POST https://conversations.twilio.com/v1/Conversations` (create conversation)
   - `POST https://conversations.twilio.com/v1/Conversations/{sid}/Participants` (add participant)

4. **Twilio → Next.js API:**
   - `POST /api/twilio/status` - Status callback (delivery updates)

## Helper Functions Used

- `formatPhoneNumber()` - Normalizes phone number format
- `findOrCreateTwilioConversation()` - Manages Twilio Conversations
- `findOrCreateConversationId()` - Manages local conversation IDs
- `hebesSendSMS()` - Calls Hebes backend API
- `hebesSenderPhoneNumbers.getAll()` - Fetches sender phone numbers
- `hebesSmsMessages.update()` - Updates message in database

## Error Handling

- Missing required fields → 400 Bad Request
- Sender phone not found → 404 Not Found
- Account not found → 404 Not Found
- Hebes API errors → 500 Internal Server Error
- Twilio API errors → Logged, falls back to direct SMS
- Frontend displays error messages to user

## Flow Diagram

```
User Action
    ↓
[SMS Page] → [New Message Panel]
    ↓
User enters phone & message
    ↓
[Form Submit] → POST /api/send-sms
    ↓
[API Route] → Validate & Format
    ↓
[Find Sender Phone] → Get account_id
    ↓
[Find/Create Twilio Conversation] → Get/Set conversation_sid
    ↓
[Find/Create Local Conversation] → Get/Set conversation_id
    ↓
[Prepare Send Data] → Build payload
    ↓
[Call Hebes Backend] → POST send_sms_test.php
    ↓
[Hebes Backend] → Call Twilio API
    ↓
[Twilio] → Send SMS
    ↓
[Response] → Update conversation_id
    ↓
[Frontend] → Show success & reload
```

## Code References

### Frontend Components
- `app/sms/page.tsx` - Main SMS page
- `src/components/pages/ChatPage.tsx` - Chat interface
- `src/components/modules/NewMessagePanel.tsx` - New message form
- `src/components/modules/NewMessageModal.tsx` - Alternative modal version
- `src/hooks/useMessages.ts` - Message management hook

### API Routes
- `app/api/send-sms/route.ts` - Main send endpoint
- `app/api/twilio/send/route.ts` - Alternative Twilio SDK endpoint
- `app/api/twilio/status/route.ts` - Status callback handler

### Library Functions
- `src/lib/api.ts` - API client utilities
- `src/lib/hebes-api.ts` - Hebes backend API client
- `src/lib/conversations.ts` - Local conversation management
- `src/lib/twilio/conversations.ts` - Twilio conversation management
- `src/lib/twilio/client.ts` - Twilio client utilities

