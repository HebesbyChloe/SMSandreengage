import { NextRequest, NextResponse } from 'next/server';
import { validatePhoneNumber, formatPhoneNumber } from '@/lib/twilio/client';
import { hebesSenderPhoneNumbers, hebesSenderAccounts, hebesSendSMS } from '@/lib/hebes-api';
import { findOrCreateConversationId } from '@/lib/conversations';
import { findOrCreateTwilioConversation } from '@/lib/twilio/conversations';

// Helper to get account ID from sender phone number
async function getAccountIdFromPhone(senderPhoneNumberId: string, token?: string | null) {
  try {
    const phoneData = await hebesSenderPhoneNumbers.getById(senderPhoneNumberId, token);
    if (!phoneData || !phoneData.account_id) {
      return null;
    }
    return phoneData.account_id;
  } catch (error) {
    console.error('Error fetching phone number:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, from, message, senderPhoneNumberId } = body;

    // Validation
    if (!to || !from || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, from, message' },
        { status: 400 }
      );
    }

    if (!validatePhoneNumber(to) || !validatePhoneNumber(from)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    if (!senderPhoneNumberId) {
      return NextResponse.json(
        { error: 'senderPhoneNumberId is required' },
        { status: 400 }
      );
    }

    // Get token from request
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;

    // Get account ID from sender phone number
    const accountId = await getAccountIdFromPhone(senderPhoneNumberId, token);
    if (!accountId) {
      return NextResponse.json(
        { error: 'Account not found for sender phone number' },
        { status: 404 }
      );
    }

    // Format phone numbers
    const formattedTo = formatPhoneNumber(to);
    const formattedFrom = formatPhoneNumber(from);

    // Find or create Twilio Conversation SID (unified way)
    console.log('📞 Finding or creating Twilio conversation for', formattedTo);
    const twilioConversationSid = await findOrCreateTwilioConversation(
      formattedTo,
      senderPhoneNumberId,
      token
    );

    if (twilioConversationSid) {
      console.log('✅ Using Twilio conversation SID:', twilioConversationSid);
    } else {
      console.log('⚠️ No Twilio conversation SID - will send directly to phone number');
    }

    // Also get local conversation ID for database tracking
    const localConversationId = await findOrCreateConversationId(formattedTo, senderPhoneNumberId, token);
    console.log('📞 Local conversation ID for', formattedTo, ':', localConversationId || 'NEW');

    // Prepare data for Hebes Backend API
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const statusCallbackUrl = `${appUrl}/api/twilio/status`;
    
    const sendData: any = {
      account_id: accountId,
      to_number: formattedTo,
      from_number: formattedFrom,
      body: message,
      sender_phone_number_id: senderPhoneNumberId,
      status_callback: statusCallbackUrl, // Twilio will call this URL with delivery status updates
    };

    // Add Twilio conversation SID if available (unified way - send via conversation)
    if (twilioConversationSid) {
      sendData.conversation_sid = twilioConversationSid;
      console.log('📤 Sending via Twilio Conversation SID:', twilioConversationSid);
    } else if (localConversationId) {
      // Fallback to local conversation ID if Twilio conversation not available
      sendData.conversation_sid = localConversationId;
      console.log('📤 Sending with local conversation ID:', localConversationId);
    }
    
    console.log('📤 Sending SMS with status callback:', statusCallbackUrl);

    // Call Hebes Backend API to send SMS
    console.log(`📡 Calling Hebes Backend API: send_sms.php`);
    const result = await hebesSendSMS(sendData, token);

    console.log('✅ SMS sent successfully:', {
      messageSid: result.data.twilio_response.parsed.sid,
      status: result.data.twilio_response.parsed.status,
    });

    return NextResponse.json({
      success: true,
      messageSid: result.data.twilio_response.parsed.sid,
      status: result.data.twilio_response.parsed.status,
      localMessage: result.data.local_message,
    });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send SMS',
        details: error.message
      },
      { status: 500 }
    );
  }
}

