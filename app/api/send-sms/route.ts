import { NextRequest, NextResponse } from 'next/server';
import { hebesSenderPhoneNumbers, hebesSendSMS, hebesSmsMessages } from '@/lib/hebes-api';
import { findOrCreateConversationId } from '@/lib/conversations';
import { findOrCreateTwilioConversation } from '@/lib/twilio/conversations';
import { getTokenFromRequest } from '@/lib/api-helpers';
import { formatPhoneNumber } from '@/lib/twilio/client';

// POST - Send SMS (legacy endpoint, uses Hebes Backend API)
export async function POST(req: NextRequest) {
  console.log('vào 1');
  try {
    const token = getTokenFromRequest(req);
    const body = await req.json();
    const { to, from, message } = body;

    if (!to || !from || !message) {
      return NextResponse.json({ error: 'Missing required fields: to, from, message' }, { status: 400 });
    }

    // Format 'from' number first to ensure consistent format
    const formattedFrom = formatPhoneNumber(from);
    
    // Find sender phone number ID from the 'from' number
    let senderPhoneNumberId = null;
    try {
      const phoneNumbers = await hebesSenderPhoneNumbers.getAll(token);
      const phoneNumbersArray = Array.isArray(phoneNumbers) ? phoneNumbers : [];
      
      // Try to find by exact match first
      let matchingPhone = phoneNumbersArray.find((p: any) => {
        const dbPhone = formatPhoneNumber(p.phone_number || '');
        return dbPhone === formattedFrom;
      });
      
      // If not found, try without formatting (in case database already has formatted number)
      if (!matchingPhone) {
        matchingPhone = phoneNumbersArray.find((p: any) => {
          const dbPhone = p.phone_number || '';
          return dbPhone === formattedFrom || dbPhone === from;
        });
      }
      
      if (matchingPhone) {
        senderPhoneNumberId = matchingPhone.id;
        console.log(`✅ Found sender phone: ${matchingPhone.phone_number} (ID: ${senderPhoneNumberId})`);
      } else {
        console.error('❌ Sender phone not found. Looking for:', formattedFrom);
        console.error('Available phones:', phoneNumbersArray.map((p: any) => p.phone_number));
        return NextResponse.json({ 
          error: 'Sender phone number not found',
          details: `Phone number "${formattedFrom}" is not registered in your sender accounts`
        }, { status: 404 });
      }
    } catch (error) {
      console.error('Error finding sender phone number:', error);
      return NextResponse.json({ error: 'Failed to find sender phone number', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    // Get account ID from phone number
    const phoneData = await hebesSenderPhoneNumbers.getById(senderPhoneNumberId, token);
    if (!phoneData || !phoneData.account_id) {
      return NextResponse.json({ error: 'Account not found for phone number' }, { status: 404 });
    }

    // Format 'to' number (from is already formatted above)
    const formattedTo = formatPhoneNumber(to);

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
    //const localConversationId = null;
    console.log('📞 Local conversation ID for', formattedTo, ':', localConversationId || 'NEW');

    // Prepare data for Hebes Backend API
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const statusCallbackUrl = `${appUrl}/api/twilio/status`;
    
    const sendData: any = {
      account_id: phoneData.account_id,
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
    console.log(`📡 Calling Hebes Backend API: send_sms_test.php`);
    const result = await hebesSendSMS(sendData, token);

    console.log('✅ SMS sent successfully:', {
      messageSid: result.data.twilio_response.parsed.sid,
      status: result.data.twilio_response.parsed.status,
    });

    // Ensure conversation_id is stored in the database
    // The Hebes API might not store conversation_sid in conversation_id field
    if (result.data.local_message && result.data.local_message.id) {
      const messageId = result.data.local_message.id;
      const conversationIdToStore = twilioConversationSid || localConversationId;
      
      if (conversationIdToStore) {
        try {
          console.log('📝 Updating message conversation_id:', {
            messageId: messageId,
            conversationId: conversationIdToStore
          });
          
          // Update the message to set conversation_id
          await hebesSmsMessages.update({
            id: messageId,
            conversation_id: conversationIdToStore,
          }, token);
          
          console.log('✅ Updated message conversation_id in database');
        } catch (updateError: any) {
          console.error('⚠️ Failed to update message conversation_id:', updateError.message);
          // Don't fail the request if update fails - message was sent successfully
        }
      }
    }

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

