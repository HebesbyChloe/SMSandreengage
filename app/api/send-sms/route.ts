import { NextRequest, NextResponse } from 'next/server';
import { hebesSenderPhoneNumbers, hebesSmsMessages, hebesConversationMeta, hebesSenderAccounts } from '@/lib/hebes-api';
import { findOrCreateTwilioConversation } from '@/lib/twilio/conversations';
import { getTokenFromRequest } from '@/lib/api-helpers';
import { formatPhoneNumber, createTwilioClient } from '@/lib/twilio/client';

// POST - Send SMS (uses Twilio SDK directly via Conversations API)
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

    // Step 1: Create Twilio Conversation (REQUIRED - no fallback)
    console.log('📞 Step 1: Creating Twilio conversation for', formattedTo);
    const twilioConversationResult = await findOrCreateTwilioConversation(
      formattedTo,
      senderPhoneNumberId,
      token
    );

    // If Twilio conversation creation fails, return error with details
    if (!twilioConversationResult) {
      console.error('❌ Failed to create Twilio conversation');
      
      // Check common failure reasons
      let errorDetails = 'Failed to create Twilio conversation. ';
      errorDetails += 'Common causes: ';
      errorDetails += '1) Missing Twilio Conversation Service (create one in Twilio Console), ';
      errorDetails += '2) Invalid account credentials, ';
      errorDetails += '3) Missing conversation_service_sid in account settings. ';
      errorDetails += 'Check server logs for detailed error information.';
      
      return NextResponse.json(
        { 
          error: 'conversation create fail',
          details: errorDetails,
          troubleshooting: {
            step1: 'Go to Twilio Console > Conversations > Services',
            step2: 'Create a Conversation Service if you don\'t have one',
            step3: 'Copy the Service SID and add it to your account settings as conversation_service_sid',
            step4: 'Verify your Twilio Account SID and Auth Token are correct'
          }
        },
        { status: 500 }
      );
    }

    // Check if result contains an error
    if ('error' in twilioConversationResult) {
      const twilioError = twilioConversationResult.error;
      console.error('❌ Twilio conversation operation failed with error:', twilioError);
      
      let errorMessage = 'Failed to find or create Twilio conversation. ';
      if (twilioError.code === 20001 || twilioError.code === 20003) {
        errorMessage += `Error Code ${twilioError.code}: Missing Conversation Service. `;
        errorMessage += 'You need to create a Conversation Service in Twilio Console. ';
      } else if (twilioError.code === 20008 || twilioError.code === 20429) {
        errorMessage += `Error Code ${twilioError.code}: Authentication failed. `;
        errorMessage += 'Please check your Account SID and Auth Token. ';
      } else {
        errorMessage += twilioError.message || 'Unknown error. ';
        // Check if it's a find API failure
        if (twilioError.message?.includes('search') || twilioError.message?.includes('find')) {
          errorMessage += 'This may indicate an issue with searching for existing conversations in Twilio. ';
        }
      }
      
      return NextResponse.json(
        { 
          error: 'conversation create fail',
          details: errorMessage,
          twilioError: {
            code: twilioError.code,
            message: twilioError.message,
            status: twilioError.status,
            moreInfo: twilioError.moreInfo
          },
          troubleshooting: {
            step1: 'Go to https://console.twilio.com/us1/develop/conversations/services',
            step2: 'Create a Conversation Service if you don\'t have one',
            step3: 'Copy the Service SID (starts with IS...)',
            step4: 'Add it to your account settings: { "conversation_service_sid": "IS..." }',
            step5: 'Verify your Twilio Account SID and Auth Token are correct in account settings',
            step6: 'Check server logs for detailed error information'
          }
        },
        { status: 500 }
      );
    }

    const twilioConversationSid = twilioConversationResult.conversationSid;
    const participantsAdded = twilioConversationResult.participantsAdded;
    
    // Determine if this is a new conversation or existing one
    // If participantsAdded is 1, it's likely a new conversation (we just added the participant)
    // If participantsAdded is 0, it's an existing conversation (participant already existed)
    const isNewConversation = participantsAdded > 0;
    
    console.log('✅ Twilio conversation:', isNewConversation ? 'CREATED (NEW)' : 'FOUND (EXISTING)');
    console.log('✅ Conversation SID:', twilioConversationSid);
    console.log('✅ Participants added:', participantsAdded);

    // Step 2: Save conversation to database
    console.log('📞 Step 2: Saving conversation to database');
    try {
      const conversationData = {
        customer_phone: formattedTo,
        sender_phone: formattedFrom,
        sender_phone_number_id: senderPhoneNumberId,
        account_id: phoneData.account_id,
        conversation_id: twilioConversationSid,
        twilio_conversation_sid: twilioConversationSid,
      };
      await hebesConversationMeta.create(conversationData, token);
      console.log('✅ Saved Twilio conversation to database');
    } catch (saveError: any) {
      console.error('⚠️ Failed to save Twilio conversation to database:', saveError.message);
      // Continue anyway - we have the SID to use for sending
    }

    // Step 3: Send SMS using Twilio SDK directly via conversation
    console.log('📤 Step 3: Sending SMS via Twilio SDK using conversation');
    
    // Get account credentials for Twilio SDK
    const account = await hebesSenderAccounts.getById(phoneData.account_id, token);
    if (!account || !account.account_sid || !account.auth_token) {
      return NextResponse.json(
        { 
          error: 'conversation create fail',
          details: 'Account credentials not found for sending SMS'
        },
        { status: 500 }
      );
    }

    // Create Twilio client
    const twilioClient = createTwilioClient({
      accountSid: account.account_sid,
      authToken: account.auth_token,
    });

    // Get conversation service SID from account settings
    let settings = account.settings;
    if (typeof settings === 'string') {
      try {
        settings = JSON.parse(settings);
      } catch (e) {
        console.warn('⚠️ Could not parse settings JSON:', e);
        settings = {};
      }
    }
    if (!settings) {
      settings = {};
    }
    const conversationServiceSid = settings?.conversation_service_sid;

    // Prepare status callback URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const statusCallbackUrl = `${appUrl}/api/twilio/status`;

    // Send message via Twilio Conversations API
    let twilioMessage;
    try {
      console.log('📤 Sending message via Twilio Conversation:', {
        conversationSid: twilioConversationSid,
        conversationServiceSid: conversationServiceSid || 'NOT SET',
        body: message,
        statusCallback: statusCallbackUrl
      });

      // Send message through the conversation
      // Use service-specific endpoint if conversation belongs to a service
      if (conversationServiceSid) {
        twilioMessage = await twilioClient.conversations.v1
          .services(conversationServiceSid)
          .conversations(twilioConversationSid)
          .messages
          .create({
            body: message,
            author: formattedFrom, // The sender phone number
          });
      } else {
        twilioMessage = await twilioClient.conversations.v1
          .conversations(twilioConversationSid)
          .messages
          .create({
            body: message,
            author: formattedFrom, // The sender phone number
          });
      }

      console.log('✅ SMS sent successfully via Twilio SDK:', {
        messageSid: twilioMessage.sid,
        status: twilioMessage.status,
        conversationSid: twilioConversationSid
      });
    } catch (sendError: any) {
      console.error('❌ Error sending SMS via Twilio SDK:', sendError);
      return NextResponse.json(
        { 
          error: 'Failed to send SMS',
          details: sendError.message || 'Unknown error sending message'
        },
        { status: 500 }
      );
    }

    // Step 4: Create message record in database
    console.log('📝 Step 4: Creating message record in database');
    let messageRecord = null;
    let conversationIdUpdateSuccess = false;
    let conversationIdUpdateError = null;

    try {
      const messageData: any = {
        direction: 'outbound',
        from_number: formattedFrom,
        to_number: formattedTo,
        body: message,
        status: twilioMessage.status || 'sent',
        provider: 'twilio',
        provider_message_sid: twilioMessage.sid,
        sender_phone_number_id: senderPhoneNumberId,
        conversation_id: twilioConversationSid,
        sent_at: new Date().toISOString(),
      };

      console.log('📝 Message data to create:', {
        direction: messageData.direction,
        from_number: messageData.from_number,
        to_number: messageData.to_number,
        hasBody: !!messageData.body,
        conversation_id: messageData.conversation_id,
        provider_message_sid: messageData.provider_message_sid
      });

      messageRecord = await hebesSmsMessages.create(messageData, token);
      console.log('✅ Created message record in database:', messageRecord?.id || 'unknown');
      conversationIdUpdateSuccess = true;
    } catch (createError: any) {
      console.error('⚠️ Failed to create message record in database:', createError);
      console.error('⚠️ Error details:', {
        message: createError.message,
        stack: createError.stack,
        response: createError.response?.data || createError.data,
        status: createError.status || createError.response?.status
      });
      
      // Try to extract more detailed error message
      let errorMsg = 'Create failed';
      if (createError.message) {
        errorMsg = createError.message;
      } else if (createError.response?.data) {
        errorMsg = typeof createError.response.data === 'string' 
          ? createError.response.data 
          : JSON.stringify(createError.response.data);
      } else if (createError.data) {
        errorMsg = typeof createError.data === 'string' 
          ? createError.data 
          : JSON.stringify(createError.data);
      }
      
      conversationIdUpdateError = errorMsg;
      // Don't fail the request - message was sent successfully via Twilio
    }

    return NextResponse.json({
      success: true,
      messageSid: twilioMessage.sid,
      status: twilioMessage.status,
      localMessage: messageRecord,
      // Temporary debugging notifications with detailed information
      notifications: {
        sendFrom: `send form this phone number: ${formattedFrom}`,
        conversationStatus: isNewConversation 
          ? `conversation created success with this conversation id: ${twilioConversationSid}`
          : `conversation found (existing) with this conversation id: ${twilioConversationSid}`,
        participantsAdded: `added ${participantsAdded} participant${participantsAdded !== 1 ? 's' : ''}`,
        conversationId: twilioConversationSid,
        isNewConversation: isNewConversation,
        conversationIdUpdateSuccess: conversationIdUpdateSuccess,
        conversationIdUpdateError: conversationIdUpdateError,
        sendSuccess: 'send success'
      }
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

