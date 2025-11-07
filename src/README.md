# SMS Chat Manager

A full-featured SMS text chat interface similar to Facebook Messenger, powered by Twilio and Supabase.

## 🌟 Features

- **Send & Receive SMS** - Full bidirectional messaging
- **Real-time Updates** - Conversations refresh automatically every 5 seconds
- **Conversation Management** - View all contacts and message history
- **Database Storage** - All messages stored securely in Supabase
- **Webhook Integration** - Receive incoming messages via Twilio webhooks
- **Admin Dashboard** - Configure Twilio credentials securely
- **System Diagnostics** - Built-in health checks and troubleshooting

## 🚀 Quick Start

See **[QUICK_START.md](./QUICK_START.md)** for a 5-minute setup guide.

### TL;DR

1. **Setup Database** → Run SQL in Supabase (Setup tab provides the command)
2. **Get Twilio Account** → Sign up at twilio.com and get a phone number  
3. **Configure Credentials** → Enter Account SID, Auth Token, Phone Number (Admin Settings tab)
4. **Setup Webhook** → Configure this URL in Twilio console:
   ```
   https://zggagxtdohrumedfwkez.supabase.co/functions/v1/make-server-0b49f85b/webhook/sms
   ```
5. **Test It** → Send/receive messages!

## 📋 Documentation

| Document | Description |
|----------|-------------|
| [QUICK_START.md](./QUICK_START.md) | 5-minute setup guide - start here! |
| [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) | Detailed step-by-step setup instructions |
| [WEBHOOK_INFO.md](./WEBHOOK_INFO.md) | Technical details about webhook configuration |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | How to test and verify everything works |
| [Attributions.md](./Attributions.md) | Third-party libraries and credits |

## 🏗️ Architecture

```
┌─────────────┐     SMS      ┌──────────┐    Webhook    ┌──────────────┐
│   Mobile    │ ────────────> │  Twilio  │ ────────────> │   Supabase   │
│   Phone     │ <──────────── │   API    │ <──────────── │ Edge Function│
└─────────────┘               └──────────┘               └──────────────┘
                                                                 │
                                                                 v
                                                          ┌──────────────┐
                                                          │   Database   │
                                                          │ sms_messages │
                                                          └──────────────┘
                                                                 │
                                                                 v
                                                          ┌──────────────┐
                                                          │   Frontend   │
                                                          │  React App   │
                                                          └──────────────┘
```

### Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno + Hono)
- **Database**: Supabase PostgreSQL
- **SMS Provider**: Twilio
- **UI Components**: Shadcn/ui + Lucide Icons

## 🔑 Key Components

### Frontend Components

- **ChatInterface** - Main chat UI with conversation list and message thread
- **AdminSettings** - Twilio credentials configuration and webhook setup
- **DatabaseSetup** - Database diagnostics and setup tools
- **MessageThread** - Individual conversation view
- **ConversationList** - All conversations with last message preview
- **SystemDiagnostics** - Real-time system health checks

### Backend Routes

All routes are prefixed with `/make-server-0b49f85b`:

| Route | Method | Description |
|-------|--------|-------------|
| `/health` | GET | Server health check |
| `/settings` | GET/POST | Get/save Twilio credentials |
| `/send-sms` | POST | Send outbound SMS |
| `/messages/:phoneNumber` | GET | Get conversation messages |
| `/conversations` | GET | List all conversations |
| `/webhook/sms` | POST | Receive incoming SMS from Twilio |
| `/webhook/sms` | GET | Test webhook accessibility |
| `/webhook/last` | GET | Get last webhook received |

### Database Schema

Table: `sms_messages`

```sql
- id (uuid, primary key)
- direction (text) - 'inbound' or 'outbound'
- from_number (text) - Sender phone number
- to_number (text) - Recipient phone number  
- body (text) - Message content
- status (text) - Message status
- provider (text) - 'twilio'
- provider_message_sid (text) - Twilio message SID
- provider_payload (jsonb) - Full Twilio response
- media_count (integer) - Number of media attachments
- sent_at (timestamp) - When message was sent
- received_at (timestamp) - When message was received
- created_at (timestamp) - Record creation time
```

## 🔒 Security

- ✅ Twilio credentials stored encrypted server-side
- ✅ Auth tokens never exposed to frontend
- ✅ Service role key only used in Edge Functions
- ✅ CORS configured for webhook accessibility
- ✅ All database queries use parameterized statements

## 🔧 Configuration

### Environment Variables

The following are automatically configured by Supabase:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access
- `SUPABASE_ANON_KEY` - Public anonymous key

### Twilio Configuration

Stored in KV store (configured via Admin Settings):

- `twilio_account_sid` - Twilio Account SID
- `twilio_auth_token` - Twilio Auth Token
- `twilio_phone_number` - Your Twilio phone number

## 📱 Usage

### Sending Messages

1. Click "New Message" (+ button) in Messages tab
2. Enter recipient phone number (with country code)
3. Type your message
4. Click "Send"

**Note**: Trial accounts can only send to verified numbers.

### Receiving Messages

1. Configure webhook URL in Twilio console
2. Send SMS to your Twilio number from any phone
3. Message appears automatically within 5 seconds
4. Click conversation to view and reply

### Managing Conversations

- Conversations sorted by most recent message
- Click any conversation to view full history
- Unread indicator shows new messages
- Search and filter (coming soon)

## 🧪 Testing

Run the built-in diagnostics:

1. **Setup Tab** → Click "Recheck Status"
2. **Setup Tab** → Click "Run Tests" in System Diagnostics
3. **Admin Settings** → Click "Test Webhook Endpoint"

For comprehensive testing guide, see **[TESTING_GUIDE.md](./TESTING_GUIDE.md)**.

## 🐛 Troubleshooting

### Webhook not accessible

**Error**: "Could not reach webhook endpoint"

**Solution**: 
```
Correct URL: https://zggagxtdohrumedfwkez.supabase.co/functions/v1/make-server-0b49f85b/webhook/sms
```

Make sure the URL is exactly as shown above!

### Messages not sending

1. Check Twilio credentials in Admin Settings
2. Verify phone number format includes country code (+1 for US)
3. For trial accounts, verify recipient number in Twilio Console
4. Check Edge Function logs in Supabase Dashboard

### Messages not receiving

1. Verify webhook URL is configured correctly in Twilio
2. HTTP method must be POST
3. Don't forget to save Twilio phone number settings
4. Check Twilio Debugger: https://console.twilio.com/us1/monitor/logs/debugger
5. View Edge Function logs in Supabase Dashboard

### Database errors

1. Go to Setup tab and click "Recheck Status"
2. If table doesn't exist, copy SQL command
3. Run SQL in Supabase SQL Editor
4. Return to app and recheck

## 📊 Monitoring

### View Logs

**Supabase Edge Functions**:
1. Go to Supabase Dashboard
2. Click "Edge Functions" in sidebar
3. Select "server" function
4. View real-time logs

**Twilio Debugger**:
1. Go to https://console.twilio.com/us1/monitor/logs/debugger
2. Filter by your phone number
3. Check for webhook POST requests
4. Look for error messages

### Database Monitoring

1. Supabase Dashboard → Table Editor
2. Select `sms_messages` table
3. View all messages
4. Check `status` and `provider_payload` for errors

## 🎯 Webhook URL Reference

Your dedicated webhook endpoint for incoming SMS:

```
https://zggagxtdohrumedfwkez.supabase.co/functions/v1/make-server-0b49f85b/webhook/sms
```

**Configure in Twilio**:
1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Select your phone number
3. Under "Messaging Configuration" → "A MESSAGE COMES IN"
4. Paste the webhook URL
5. Set HTTP method to **POST**
6. Click **Save**

## 🚦 System Status

Check system health in the app:

- **Setup Tab** → View database and server status
- **Admin Settings** → View webhook status
- **System Diagnostics** → Run comprehensive tests

Green checkmarks = everything working! ✅

## 📝 Development

### Project Structure

```
/
├── App.tsx                    # Main application component
├── components/                # React components
│   ├── ChatInterface.tsx      # Main chat UI
│   ├── AdminSettings.tsx      # Settings panel
│   ├── DatabaseSetup.tsx      # Database diagnostics
│   ├── MessageThread.tsx      # Conversation view
│   ├── ConversationList.tsx   # Contact list
│   └── ui/                    # Shadcn components
├── supabase/functions/        # Edge Functions
│   └── server/
│       ├── index.tsx          # Main server routes
│       └── kv_store.tsx       # KV utilities
├── utils/                     # Utilities
│   ├── api.ts                 # API client
│   └── supabase/
│       └── info.tsx           # Supabase config
└── styles/
    └── globals.css            # Global styles
```

### Adding Features

1. **New Route**: Add to `/supabase/functions/server/index.tsx`
2. **New Component**: Create in `/components/`
3. **New Utility**: Add to `/utils/`
4. **Update Schema**: Modify `sms_messages` table as needed

## 🤝 Contributing

This is a Figma Make prototype. To extend functionality:

1. Fork the project
2. Add your features
3. Test thoroughly using TESTING_GUIDE.md
4. Document changes in README.md

## 📄 License

This project uses Twilio and Supabase services. Ensure you comply with their terms of service.

## 🆘 Support

If you encounter issues:

1. Check **[QUICK_START.md](./QUICK_START.md)** for setup
2. Review **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** for diagnostics
3. Read **TroubleshootingGuide** in Admin Settings tab
4. Check browser console (F12) for errors
5. Review Edge Function logs in Supabase Dashboard
6. Check Twilio Debugger for webhook issues

## ✨ Credits

Built with:
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/)
- [Twilio](https://www.twilio.com/)
- [Shadcn/ui](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)
- [Hono](https://hono.dev/)

See [Attributions.md](./Attributions.md) for complete list.

---

**Ready to get started?** Follow the [QUICK_START.md](./QUICK_START.md) guide! 🚀
