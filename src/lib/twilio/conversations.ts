/**
 * Twilio Conversations API utilities
 * Handles finding or creating Twilio Conversations and adding participants
 */

import { createTwilioClient, formatPhoneNumber } from './client';
import { hebesSenderAccounts, hebesSenderPhoneNumbers, hebesSmsMessages, hebesGet } from '../hebes-api';

/**
 * Find or create a Twilio Conversation for a customer phone number
 * Returns the Twilio Conversation SID
 */
export async function findOrCreateTwilioConversation(
  customerPhone: string,
  senderPhoneNumberId: string,
  token?: string | null
): Promise<string | null> {
  try {
    // Get sender phone number data
    const phoneData = await hebesSenderPhoneNumbers.getById(senderPhoneNumberId, token);
    if (!phoneData || !phoneData.account_id) {
      console.error('❌ Sender phone number or account not found');
      return null;
    }

    // Get sender account (contains Twilio credentials)
    const account = await hebesSenderAccounts.getById(phoneData.account_id, token);
    if (!account || !account.account_sid || !account.auth_token) {
      console.error('❌ Sender account credentials not found');
      return null;
    }

    // Format phone numbers
    const formattedCustomerPhone = formatPhoneNumber(customerPhone);
    const formattedSenderPhone = formatPhoneNumber(phoneData.phone_number);
    
    // Validate sender phone number exists
    if (!formattedSenderPhone || !phoneData.phone_number) {
      console.error('❌ Sender phone number is missing or invalid:', {
        phoneData: phoneData.phone_number,
        formatted: formattedSenderPhone,
        phoneDataId: phoneData.id
      });
      return null;
    }
    
    console.log('📞 Phone numbers for conversation:', {
      customer: formattedCustomerPhone,
      sender: formattedSenderPhone,
      senderPhoneNumberId: senderPhoneNumberId
    });

    // Query Hebes API for messages matching this customer phone and sender phone number
    // This queries the API directly instead of getting all messages and filtering locally
    let existingMessages: any[] = [];
    
    try {
      // Query Hebes API with specific parameters for outbound messages (to_number)
      const outboundQuery = `sms_messages.php?to_number=${encodeURIComponent(formattedCustomerPhone)}&sender_phone_number_id=${encodeURIComponent(senderPhoneNumberId)}`;
      const outboundMessages = await hebesGet<any[]>(outboundQuery, token);
      if (Array.isArray(outboundMessages)) {
        existingMessages = [...existingMessages, ...outboundMessages];
      }
      
      // Also query for inbound messages (from_number)
      const inboundQuery = `sms_messages.php?from_number=${encodeURIComponent(formattedCustomerPhone)}&sender_phone_number_id=${encodeURIComponent(senderPhoneNumberId)}`;
      const inboundMessages = await hebesGet<any[]>(inboundQuery, token);
      if (Array.isArray(inboundMessages)) {
        existingMessages = [...existingMessages, ...inboundMessages];
      }
      
      console.log(`📡 Queried Hebes API: found ${existingMessages.length} messages for customer ${formattedCustomerPhone} and sender ${senderPhoneNumberId}`);
      if (existingMessages.length > 0) {
        console.log('📋 Messages found:', existingMessages.map((m: any) => ({
          id: m.id,
          direction: m.direction,
          from: m.from_number,
          to: m.to_number,
          conversation_id: m.conversation_id,
          sender_phone_number_id: m.sender_phone_number_id
        })));
      }
    } catch (error: any) {
      console.warn('⚠️ Error querying Hebes API for messages, falling back to getAll:', error.message);
      // Fallback to getAll if query fails
      const allMessages = await hebesSmsMessages.getAll(token);
      const messagesArray = Array.isArray(allMessages) ? allMessages : [];
      existingMessages = messagesArray.filter((msg: any) => {
        if (!msg) return false;
        const msgCustomerPhone = msg.direction === 'inbound' ? msg.from_number : msg.to_number;
        const customerMatch = msgCustomerPhone === formattedCustomerPhone;
        if (!customerMatch) return false;
        if (msg.sender_phone_number_id && senderPhoneNumberId) {
          return msg.sender_phone_number_id === senderPhoneNumberId;
        }
        const msgSenderPhone = msg.direction === 'inbound' ? msg.to_number : msg.from_number;
        return msgSenderPhone === formattedSenderPhone;
      });
    }

    // Check if any message has a Twilio conversation SID
    // Twilio Conversation SIDs start with "CH" (e.g., "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
    // IMPORTANT: Only use conversation SID if the message is for THIS customer phone
    for (const msg of existingMessages) {
      // Double-check this message is for the correct customer phone
      const msgCustomerPhone = msg.direction === 'inbound' ? msg.from_number : msg.to_number;
      if (msgCustomerPhone !== formattedCustomerPhone) {
        console.warn('⚠️ Skipping message - customer phone mismatch:', {
          expected: formattedCustomerPhone,
          found: msgCustomerPhone,
          messageId: msg.id
        });
        continue; // Skip this message - it's not for the right customer
      }
      
      // Double-check this message is from the correct sender
      const msgSenderMatch = (msg.sender_phone_number_id && msg.sender_phone_number_id === senderPhoneNumberId) ||
                             (msg.direction === 'inbound' ? msg.to_number === formattedSenderPhone : msg.from_number === formattedSenderPhone);
      if (!msgSenderMatch) {
        console.warn('⚠️ Skipping message - sender mismatch:', {
          expectedSenderId: senderPhoneNumberId,
          foundSenderId: msg.sender_phone_number_id,
          messageId: msg.id
        });
        continue; // Skip this message - it's not from the right sender
      }
      
      let conversationSid: string | null = null;
      
      // Check conversation_id - if it starts with "CH", it's a Twilio conversation SID
      if (msg.conversation_id && typeof msg.conversation_id === 'string' && msg.conversation_id.startsWith('CH')) {
        conversationSid = msg.conversation_id;
        console.log('✅ Found existing Twilio conversation SID in conversation_id:', conversationSid, 'for customer:', formattedCustomerPhone, 'sender:', formattedSenderPhone);
      }
      // Also check provider_conversation_sid and conversation_sid fields
      else if (msg.provider_conversation_sid && typeof msg.provider_conversation_sid === 'string' && msg.provider_conversation_sid.startsWith('CH')) {
        conversationSid = msg.provider_conversation_sid;
        console.log('✅ Found existing Twilio conversation SID in provider_conversation_sid:', conversationSid, 'for customer:', formattedCustomerPhone, 'sender:', formattedSenderPhone);
      }
      else if (msg.conversation_sid && typeof msg.conversation_sid === 'string' && msg.conversation_sid.startsWith('CH')) {
        conversationSid = msg.conversation_sid;
        console.log('✅ Found existing Twilio conversation SID in conversation_sid:', conversationSid, 'for customer:', formattedCustomerPhone, 'sender:', formattedSenderPhone);
      }
      
      if (conversationSid) {
        // Verify and ensure participants exist for this conversation
        await ensureConversationParticipants(conversationSid, formattedCustomerPhone, formattedSenderPhone, account);
        return conversationSid;
      }
    }

    // No existing conversation - create a new one using Twilio Conversations API
    console.log('📞 Creating new Twilio conversation for', formattedCustomerPhone);
    
    const twilioClient = createTwilioClient({
      accountSid: account.account_sid,
      authToken: account.auth_token,
    });

    // Create conversation
    // Note: Twilio Conversations API requires a Conversation Service SID
    // If you don't have one, you'll need to create it first or use the default
    // For now, we'll try to create a conversation directly
    // If this fails, you may need to set up a Conversation Service first
    
    try {
      // Try to create conversation using the Conversations API
      // The conversation will be created in the default service if available
      // If you have a specific service SID, you can add it to account settings
      const conversationServiceSid = account.settings?.conversation_service_sid;
      
      const conversationParams: any = {
        friendlyName: `Conversation with ${formattedCustomerPhone}`,
      };
      
      // Add service SID if available in account settings
      if (conversationServiceSid) {
        // Note: service SID is set at the account level, not per conversation
        // Conversations are created in the default service or specified service
        console.log('📞 Using Conversation Service SID:', conversationServiceSid);
      }

      const conversation = await twilioClient.conversations.v1.conversations.create(conversationParams);

      const conversationSid = conversation.sid;
      console.log('✅ Created Twilio conversation:', conversationSid);

      // Add recipient as participant
      // Only the recipient needs to be added - our Twilio number is the proxy (FROM number)
      
      let participantsAdded = 0;
      const errors: string[] = [];

      // Add recipient (customer) as participant
      // address = recipient's phone number (the customer we're sending to)
      // proxyAddress = our Twilio phone number (this will be the FROM number in messages)
      // We only need to add the recipient - the sender (our Twilio number) is already the proxy
      try {
        const participantParams = {
          'messagingBinding.address': formattedCustomerPhone, // Recipient's phone number
          'messagingBinding.proxyAddress': formattedSenderPhone, // Our Twilio phone number (will be FROM)
        };
        
        console.log('📞 Adding recipient participant with params:', {
          address: participantParams['messagingBinding.address'],
          proxyAddress: participantParams['messagingBinding.proxyAddress'],
          conversationSid: conversationSid
        });
        
        await twilioClient.conversations.v1
          .conversations(conversationSid)
          .participants
          .create(participantParams);
        console.log('✅ Added recipient participant:', formattedCustomerPhone, 'via proxy (FROM):', formattedSenderPhone);
        participantsAdded++;
      } catch (participantError: any) {
        const errorMsg = `Failed to add recipient participant: ${participantError.message}`;
        console.error('❌', errorMsg);
        console.error('Error details:', {
          code: participantError.code,
          status: participantError.status,
          moreInfo: participantError.moreInfo,
          recipientPhone: formattedCustomerPhone,
          senderPhone: formattedSenderPhone,
        });
        errors.push(errorMsg);
      }

      // If we couldn't add the recipient participant, the conversation won't work
      if (participantsAdded === 0) {
        console.error('❌ Failed to add recipient participant to conversation. Conversation will not work.');
        console.error('Errors:', errors);
        // Don't return conversation SID if participant wasn't added - it won't work
        return null;
      }

      console.log('✅ Successfully added recipient participant to conversation. Messages will be sent FROM:', formattedSenderPhone);

      return conversationSid;
    } catch (twilioError: any) {
      console.error('❌ Error creating Twilio conversation:', twilioError.message);
      console.error('❌ Error code:', twilioError.code);
      
      // If the error is about missing service, provide helpful message
      if (twilioError.message?.includes('service') || twilioError.code === 20001 || twilioError.code === 20003) {
        console.error('💡 Note: You may need to create a Twilio Conversation Service first.');
        console.error('💡 See: https://www.twilio.com/docs/conversations/api/service-resource');
        console.error('💡 You can also add conversation_service_sid to your account settings.');
      }
      
      // Return null to fall back to direct SMS sending
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error in findOrCreateTwilioConversation:', error);
    return null;
  }
}

/**
 * Ensure participants exist in a Twilio conversation
 * Adds missing participants if needed
 */
async function ensureConversationParticipants(
  conversationSid: string,
  customerPhone: string,
  senderPhone: string,
  account: any
): Promise<void> {
  try {
    const twilioClient = createTwilioClient({
      accountSid: account.account_sid,
      authToken: account.auth_token,
    });

    // Get existing participants
    const participants = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .participants
      .list();

    const participantAddresses = new Set(
      participants.map((p: any) => p.messagingBinding?.address).filter(Boolean)
    );

    // Only check if recipient (customer) participant exists
    // The sender (our Twilio number) doesn't need to be a participant - it's the proxy
    let needsRecipient = !participantAddresses.has(customerPhone);

    if (!needsRecipient) {
      console.log('✅ Recipient participant already exists in conversation');
      return;
    }

    // Add missing recipient participant
    if (needsRecipient) {
      try {
        await twilioClient.conversations.v1
          .conversations(conversationSid)
          .participants
          .create({
            'messagingBinding.address': customerPhone, // Recipient's phone number
            'messagingBinding.proxyAddress': senderPhone, // Our Twilio phone number (will be FROM)
          });
        console.log('✅ Added missing recipient participant:', customerPhone, 'via proxy (FROM):', senderPhone);
      } catch (error: any) {
        console.error('⚠️ Error adding recipient participant to existing conversation:', error.message);
      }
    }
  } catch (error: any) {
    console.error('⚠️ Error checking/adding participants to conversation:', error.message);
    // Don't throw - this is a best-effort operation
  }
}

/**
 * Alternative: Find existing Twilio conversation by searching through conversations
 * This is more efficient if you have many conversations
 */
export async function findTwilioConversationByPhone(
  customerPhone: string,
  senderPhoneNumberId: string,
  token?: string | null
): Promise<string | null> {
  try {
    // Get sender phone number data
    const phoneData = await hebesSenderPhoneNumbers.getById(senderPhoneNumberId, token);
    if (!phoneData || !phoneData.account_id) {
      return null;
    }

    // Get sender account
    const account = await hebesSenderAccounts.getById(phoneData.account_id, token);
    if (!account || !account.account_sid || !account.auth_token) {
      return null;
    }

    const twilioClient = createTwilioClient({
      accountSid: account.account_sid,
      authToken: account.auth_token,
    });

    const formattedCustomerPhone = formatPhoneNumber(customerPhone);

    // List conversations and find one with matching participant
    // Note: This requires listing all conversations which can be slow
    // It's better to store the conversation SID in your database
    try {
      const conversations = await twilioClient.conversations.v1.conversations.list({ limit: 100 });
      
      for (const conversation of conversations) {
        // Get participants for this conversation
        const participants = await twilioClient.conversations.v1
          .conversations(conversation.sid)
          .participants
          .list();

        // Check if customer phone is a participant
        const hasCustomer = participants.some(
          (p: any) => p.messagingBinding?.address === formattedCustomerPhone
        );

        if (hasCustomer) {
          console.log('✅ Found existing Twilio conversation:', conversation.sid);
          return conversation.sid;
        }
      }
    } catch (error: any) {
      console.error('Error searching conversations:', error.message);
    }

    return null;
  } catch (error: any) {
    console.error('Error in findTwilioConversationByPhone:', error);
    return null;
  }
}

