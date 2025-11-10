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
): Promise<{ conversationSid: string; participantsAdded: number } | { error: TwilioConversationError } | null> {
  try {
    // Get sender phone number data
    const phoneData = await hebesSenderPhoneNumbers.getById(senderPhoneNumberId, token);
    if (!phoneData || !phoneData.account_id) {
      console.error('❌ Sender phone number or account not found');
      return {
        error: {
          message: 'Sender phone number or account not found',
          code: 404,
        }
      };
    }

    // Get sender account (contains Twilio credentials)
    const account = await hebesSenderAccounts.getById(phoneData.account_id, token);
    if (!account || !account.account_sid || !account.auth_token) {
      console.error('❌ Sender account credentials not found', {
        hasAccount: !!account,
        hasAccountSid: !!account?.account_sid,
        hasAuthToken: !!account?.auth_token,
        accountId: phoneData.account_id
      });
      return {
        error: {
          message: 'Sender account credentials not found. Please check Account SID and Auth Token.',
          code: 401,
        }
      };
    }
    
    // Parse settings if it's a string
    let settings = account.settings;
    console.log('📋 Raw account settings:', {
      type: typeof account.settings,
      value: typeof account.settings === 'string' ? account.settings.substring(0, 200) : account.settings,
      isString: typeof account.settings === 'string',
      isObject: typeof account.settings === 'object',
      isNull: account.settings === null,
      isUndefined: account.settings === undefined,
    });
    
    if (typeof settings === 'string') {
      try {
        settings = JSON.parse(settings);
        console.log('✅ Successfully parsed settings JSON');
      } catch (e) {
        console.warn('⚠️ Could not parse settings JSON:', e);
        settings = {};
      }
    }
    if (!settings) {
      settings = {};
    }
    
    console.log('📋 Parsed settings:', {
      settings,
      conversation_service_sid: settings?.conversation_service_sid || 'NOT FOUND',
      hasConversationServiceSid: !!settings?.conversation_service_sid,
    });

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
      return {
        error: {
          message: 'Sender phone number is missing or invalid',
          code: 400,
        }
      };
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

    // Log how many existing messages were found
    console.log(`📋 Found ${existingMessages.length} existing messages for customer ${formattedCustomerPhone} and sender ${senderPhoneNumberId}`);
    
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
        const participantsResult = await ensureConversationParticipants(conversationSid, formattedCustomerPhone, formattedSenderPhone, account);
        return {
          conversationSid: conversationSid,
          participantsAdded: participantsResult?.participantsAdded || 1 // Assume at least 1 if we found existing conversation
        };
      }
    }

    // No existing conversation found in local database - check Twilio API directly
    console.log('📞 No existing conversation found in local database. Checking Twilio API for existing conversation...');
    
    const twilioClient = createTwilioClient({
      accountSid: account.account_sid,
      authToken: account.auth_token,
    });

    // Step 2: Call Twilio API to find conversation by phone number
    const conversationServiceSid = settings?.conversation_service_sid;
    const findResult = await findTwilioConversationByPhoneAPI(
      formattedCustomerPhone,
      formattedSenderPhone,
      account.account_sid,
      account.auth_token,
      conversationServiceSid
    );

    // Check if find API call failed
    if ('error' in findResult) {
      console.error('❌ Failed to search Twilio for existing conversation:', findResult.error);
      return { error: findResult.error };
    }

    console.log(`🔍 Twilio API search results: found ${findResult.found} conversation(s) with customer phone ${formattedCustomerPhone}`);
    console.log(`📋 All found conversations:`, findResult.conversations.map((c: any) => ({
      conversationSid: c.conversationSid,
      participants: c.participants.map((p: any) => ({
        address: p.address,
        proxyAddress: p.proxyAddress
      }))
    })));

    // Helper function to normalize phone numbers for comparison
    const normalizePhone = (phone: string) => {
      if (!phone) return '';
      // Remove all non-digit characters except +
      return phone.replace(/[^\d+]/g, '');
    };
    
    const normalizedCustomerPhone = normalizePhone(formattedCustomerPhone);
    const normalizedSenderPhone = normalizePhone(formattedSenderPhone);
    
    // Helper function to check if two phone numbers match (handles various formats)
    const phonesMatch = (phone1: string, phone2: string): boolean => {
      if (!phone1 || !phone2) return false;
      // Try exact match
      if (phone1 === phone2) return true;
      // Try normalized match
      const norm1 = normalizePhone(phone1);
      const norm2 = normalizePhone(phone2);
      if (norm1 === norm2) return true;
      // Try with/without + prefix
      const withPlus1 = phone1.startsWith('+') ? phone1 : `+${phone1}`;
      const withoutPlus1 = phone1.startsWith('+') ? phone1.slice(1) : phone1;
      if (phone2 === withPlus1 || phone2 === withoutPlus1) return true;
      return false;
    };
    
    // Filter results to find conversation matching both customer AND sender phone
    // Priority: exact match (both phones) > customer phone only
    const exactMatches: any[] = [];
    const customerOnlyMatches: any[] = [];
    
    findResult.conversations.forEach((conv: any) => {
      const participantAddresses = conv.participants.map((p: any) => p.address).filter(Boolean);
      const participantProxyAddresses = conv.participants.map((p: any) => p.proxyAddress).filter(Boolean);
      const allParticipantPhones = [...participantAddresses, ...participantProxyAddresses];
      
      // Check if customer phone is a participant
      const hasCustomer = participantAddresses.some((addr: string) => phonesMatch(addr, formattedCustomerPhone) || phonesMatch(addr, customerPhone));
      
      // Check if sender phone is a participant (as address or proxyAddress)
      const hasSender = allParticipantPhones.some((addr: string) => phonesMatch(addr, formattedSenderPhone));
      
      if (hasCustomer && hasSender) {
        exactMatches.push(conv);
      } else if (hasCustomer) {
        customerOnlyMatches.push(conv);
      }
    });
    
    // Prefer exact matches, but fall back to customer-only matches if no exact match
    const matchingConversations = exactMatches.length > 0 ? exactMatches : customerOnlyMatches;
    
    if (exactMatches.length > 0) {
      console.log(`✅ Found ${exactMatches.length} exact match(es) (both customer and sender phone match)`);
    } else if (customerOnlyMatches.length > 0) {
      console.log(`⚠️ Found ${customerOnlyMatches.length} conversation(s) with customer phone, but sender phone doesn't match exactly`);
      console.log(`💡 Will use the first one and ensure sender phone is added as participant`);
    }

    if (matchingConversations.length > 0) {
      // Use the first matching conversation (or most recent if we want to sort)
      const selectedConversation = matchingConversations[0];
      const conversationSid = selectedConversation.conversationSid;
      
      console.log('✅ Found existing Twilio conversation matching both phones:', conversationSid);
      console.log('📋 Conversation details:', {
        conversationSid,
        customerPhone: formattedCustomerPhone,
        senderPhone: formattedSenderPhone,
        participants: selectedConversation.participants
      });

      // Verify and ensure participants exist for this conversation
      // This will check if participant exists and only add if missing
      const participantsResult = await ensureConversationParticipants(conversationSid, formattedCustomerPhone, formattedSenderPhone, account);
      return {
        conversationSid: conversationSid,
        participantsAdded: participantsResult?.participantsAdded || 0
      };
    }

    // If we found conversations but none matched both phones, check if any have the customer phone
    // In that case, we might want to use it anyway (less strict matching)
    if (findResult.found > 0 && findResult.conversations.length > 0) {
      console.log(`⚠️ Found ${findResult.found} conversation(s) with customer phone, but none matched both customer AND sender phone`);
      console.log(`💡 This might indicate the conversation exists but with different sender phone configuration`);
      console.log(`📋 Available conversations:`, findResult.conversations.map((c: any) => ({
        conversationSid: c.conversationSid,
        participants: c.participants.map((p: any) => ({
          address: p.address,
          proxyAddress: p.proxyAddress
        }))
      })));
      
      // For now, we'll still create a new one, but this might cause the "already exists" error
      // The error handler will catch this and we can improve the logic
    }

    // No existing conversation found in Twilio either - create a new one
    console.log('📞 No existing conversation found in Twilio API (found 0 matching both phones). Creating NEW Twilio conversation for', formattedCustomerPhone);
    console.log('📞 This is a NEW conversation - no previous messages or conversations found for this customer/sender combination');

    // Create conversation
    // Note: Twilio Conversations API requires a Conversation Service SID
    // If you don't have one, you'll need to create it first or use the default
    // For now, we'll try to create a conversation directly
    // If this fails, you may need to set up a Conversation Service first
    
    try {
      // Try to create conversation using the Conversations API
      // The conversation will be created in the default service if available
      // If you have a specific service SID, you can add it to account settings
      const conversationServiceSid = settings?.conversation_service_sid;
      
      console.log('📞 Account settings:', {
        hasSettings: !!settings,
        settingsType: typeof account.settings,
        conversationServiceSid: conversationServiceSid || 'NOT SET',
        accountSid: account.account_sid ? 'SET' : 'NOT SET',
        authToken: account.auth_token ? 'SET' : 'NOT SET',
        accountId: account.id
      });
      
      const conversationParams: any = {
        friendlyName: `Conversation with ${formattedCustomerPhone}`,
      };
      
      // Note: Twilio Conversations API requires a Conversation Service
      // If a service SID is provided, use the service-specific endpoint
      // Otherwise, try to use the default service
      let conversation;
      
      if (conversationServiceSid) {
        console.log('📞 Conversation Service SID found in settings:', conversationServiceSid);
        console.log('📞 Using service-specific endpoint to create conversation');
        // Use the service-specific endpoint: /v1/Services/{ServiceSid}/Conversations
        conversation = await twilioClient.conversations.v1
          .services(conversationServiceSid)
          .conversations
          .create(conversationParams);
      } else {
        console.log('⚠️ No Conversation Service SID in account settings.');
        console.log('💡 Attempting to use default service (may fail if no default is set)');
        console.log('📞 Attempting to create Twilio conversation with params:', conversationParams);
        // Try to use the default service
        conversation = await twilioClient.conversations.v1.conversations.create(conversationParams);
      }

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
          conversationSid: conversationSid,
          conversationServiceSid: conversationServiceSid || 'NOT SET'
        });
        
        // Use service-specific endpoint if conversation belongs to a service
        if (conversationServiceSid) {
          await twilioClient.conversations.v1
            .services(conversationServiceSid)
            .conversations(conversationSid)
            .participants
            .create(participantParams);
        } else {
          await twilioClient.conversations.v1
            .conversations(conversationSid)
            .participants
            .create(participantParams);
        }
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
          conversationSid: conversationSid,
          conversationServiceSid: conversationServiceSid || 'NOT SET',
        });
        
        // Check if error indicates participant already exists in another conversation
        if (participantError.message && participantError.message.includes('already exists in Conversation')) {
          // Extract the existing conversation SID from error message
          // Format: "A binding for this participant and proxy address already exists in Conversation CH..."
          const match = participantError.message.match(/Conversation\s+([A-Za-z0-9]+)/);
          const existingConversationSid = match ? match[1] : null;
          
          if (existingConversationSid) {
            console.error(`💡 Participant already exists in conversation: ${existingConversationSid}`);
            console.error(`💡 This means the conversation exists but our search didn't find it.`);
            console.error(`💡 Possible reasons: filtering too strict, or conversation in different service`);
            console.log(`🔄 Attempting to use existing conversation: ${existingConversationSid}`);
            
            // Delete the conversation we just created (cleanup)
            try {
              if (conversationServiceSid) {
                await twilioClient.conversations.v1
                  .services(conversationServiceSid)
                  .conversations(conversationSid)
                  .remove();
              } else {
                await twilioClient.conversations.v1
                  .conversations(conversationSid)
                  .remove();
              }
              console.log(`🗑️ Deleted duplicate conversation: ${conversationSid}`);
            } catch (deleteError: any) {
              console.warn(`⚠️ Could not delete duplicate conversation ${conversationSid}:`, deleteError.message);
            }
            
            // Try to use the existing conversation instead
            try {
              const participantsResult = await ensureConversationParticipants(existingConversationSid, formattedCustomerPhone, formattedSenderPhone, account);
              console.log(`✅ Successfully using existing conversation: ${existingConversationSid}`);
              return {
                conversationSid: existingConversationSid,
                participantsAdded: participantsResult?.participantsAdded || 0
              };
            } catch (useExistingError: any) {
              console.error('❌ Failed to use existing conversation:', useExistingError.message);
              errors.push(errorMsg);
            }
          } else {
            errors.push(errorMsg);
          }
        } else {
          errors.push(errorMsg);
        }
      }

      // If we couldn't add the recipient participant, the conversation won't work
      if (participantsAdded === 0) {
        console.error('❌ Failed to add recipient participant to conversation. Conversation will not work.');
        console.error('Errors:', errors);
        // Don't return conversation SID if participant wasn't added - it won't work
        return {
          error: {
            message: `Failed to add recipient participant to conversation: ${errors.join('; ')}`,
            code: 500,
          }
        };
      }

      console.log('✅ Successfully added recipient participant to conversation. Messages will be sent FROM:', formattedSenderPhone);

      return {
        conversationSid: conversationSid,
        participantsAdded: participantsAdded
      };
    } catch (twilioError: any) {
      const errorDetails = {
        message: twilioError.message,
        code: twilioError.code,
        status: twilioError.status,
        moreInfo: twilioError.moreInfo,
        stack: twilioError.stack
      };
      
      console.error('❌ Error creating Twilio conversation:', errorDetails);
      console.error('❌ Full error object:', JSON.stringify(twilioError, Object.getOwnPropertyNames(twilioError), 2));
      
      // Check for specific error codes
      if (twilioError.code === 20001 || twilioError.code === 20003) {
        console.error('💡 Error Code 20001/20003: Missing Conversation Service');
        console.error('💡 Solution: Create a Conversation Service in Twilio Console');
        console.error('💡 See: https://www.twilio.com/docs/conversations/api/service-resource');
      } else if (twilioError.code === 20008 || twilioError.code === 20429) {
        console.error('💡 Error Code 20008/20429: Authentication failed');
        console.error('💡 Solution: Check your Account SID and Auth Token');
      } else if (twilioError.message?.toLowerCase().includes('service')) {
        console.error('💡 Error mentions "service": Missing Conversation Service');
        console.error('💡 Solution: Create a Conversation Service and add conversation_service_sid to account settings');
      }
      
      // Return error details
      return { error: errorDetails };
    }
  } catch (error: any) {
    console.error('❌ Error in findOrCreateTwilioConversation:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return {
      error: {
        message: error.message || 'Unknown error in findOrCreateTwilioConversation',
        code: error.code || 500,
        status: error.status,
        moreInfo: error.moreInfo,
      }
    };
  }
}

// Export error details for better error reporting
export interface TwilioConversationError {
  code?: number;
  message?: string;
  status?: number;
  moreInfo?: string;
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
): Promise<{ participantsAdded: number }> {
  let participantsAdded = 0;
  try {
    const twilioClient = createTwilioClient({
      accountSid: account.account_sid,
      authToken: account.auth_token,
    });

    // Parse settings to get conversation_service_sid
    let settings = account.settings;
    if (typeof settings === 'string') {
      try {
        settings = JSON.parse(settings);
      } catch (e) {
        settings = {};
      }
    }
    if (!settings) {
      settings = {};
    }
    const conversationServiceSid = settings?.conversation_service_sid;

    // Helper function to get participants (using service-specific endpoint if needed)
    const getParticipants = async () => {
      if (conversationServiceSid) {
        return await twilioClient.conversations.v1
          .services(conversationServiceSid)
          .conversations(conversationSid)
          .participants
          .list();
      } else {
        return await twilioClient.conversations.v1
          .conversations(conversationSid)
          .participants
          .list();
      }
    };

    // Get existing participants
    const participants = await getParticipants();

    const participantAddresses = new Set(
      participants.map((p: any) => p.messagingBinding?.address).filter(Boolean)
    );

    // Only check if recipient (customer) participant exists
    // The sender (our Twilio number) doesn't need to be a participant - it's the proxy
    let needsRecipient = !participantAddresses.has(customerPhone);

    if (!needsRecipient) {
      console.log('✅ Recipient participant already exists in conversation');
      return { participantsAdded: 0 };
    }

    // Add missing recipient participant
    if (needsRecipient) {
      try {
        const participantParams = {
          'messagingBinding.address': customerPhone, // Recipient's phone number
          'messagingBinding.proxyAddress': senderPhone, // Our Twilio phone number (will be FROM)
        };
        
        // Use service-specific endpoint if conversation belongs to a service
        if (conversationServiceSid) {
          await twilioClient.conversations.v1
            .services(conversationServiceSid)
            .conversations(conversationSid)
            .participants
            .create(participantParams);
        } else {
          await twilioClient.conversations.v1
            .conversations(conversationSid)
            .participants
            .create(participantParams);
        }
        console.log('✅ Added missing recipient participant:', customerPhone, 'via proxy (FROM):', senderPhone);
        participantsAdded = 1;
      } catch (error: any) {
        console.error('⚠️ Error adding recipient participant to existing conversation:', error.message);
      }
    }
  } catch (error: any) {
    console.error('⚠️ Error checking/adding participants to conversation:', error.message);
    // Don't throw - this is a best-effort operation
  }
  return { participantsAdded };
}

/**
 * Helper function to find Twilio conversations by phone number using Twilio API
 * This directly uses the Twilio SDK (same logic as the test endpoint)
 */
async function findTwilioConversationByPhoneAPI(
  customerPhone: string,
  senderPhone: string,
  accountSid: string,
  authToken: string,
  conversationServiceSid?: string
): Promise<{ found: number; conversations: any[] } | { error: TwilioConversationError }> {
  try {
    const twilioClient = createTwilioClient({
      accountSid,
      authToken,
    });

    const limit = 1000; // Search through up to 1000 conversations
    
    // List conversations (from service if provided, otherwise all)
    let conversations: any[];
    if (conversationServiceSid) {
      conversations = await twilioClient.conversations.v1
        .services(conversationServiceSid)
        .conversations
        .list({ limit });
    } else {
      conversations = await twilioClient.conversations.v1.conversations.list({ limit });
    }
    
    console.log(`🔍 Searching Twilio API for phone ${customerPhone} in ${conversations.length} conversations`);
    
    // Search through conversations to find ones with matching participant
    const matchingConversations: any[] = [];
    
    // Helper function to get participants (using service-specific endpoint if needed)
    const getParticipants = async (conversationSid: string) => {
      if (conversationServiceSid) {
        return await twilioClient.conversations.v1
          .services(conversationServiceSid)
          .conversations(conversationSid)
          .participants
          .list();
      } else {
        return await twilioClient.conversations.v1
          .conversations(conversationSid)
          .participants
          .list();
      }
    };
    
    // Normalize phone numbers for comparison
    const normalizePhone = (phone: string) => phone?.replace(/[\s\-\(\)]/g, '') || '';
    const normalizedCustomerPhone = normalizePhone(customerPhone);
    
    for (const conversation of conversations) {
      try {
        const participants = await getParticipants(conversation.sid);
        
        // Check if customer phone matches any participant's address
        const hasMatch = participants.some((p: any) => {
          const participantAddress = p.messagingBinding?.address;
          if (!participantAddress) return false;
          
          // Try exact match first
          if (participantAddress === customerPhone) return true;
          
          // Try normalized match
          const normalizedParticipantPhone = normalizePhone(participantAddress);
          if (normalizedParticipantPhone === normalizedCustomerPhone) return true;
          
          // Try with/without + prefix
          const withPlus = customerPhone.startsWith('+') ? customerPhone : `+${customerPhone}`;
          const withoutPlus = customerPhone.startsWith('+') ? customerPhone.slice(1) : customerPhone;
          
          if (participantAddress === withPlus || participantAddress === withoutPlus) return true;
          
          return false;
        });
        
        if (hasMatch) {
          matchingConversations.push({
            conversationSid: conversation.sid,
            friendlyName: conversation.friendlyName,
            dateCreated: conversation.dateCreated,
            dateUpdated: conversation.dateUpdated,
            state: conversation.state,
            participants: participants.map((p: any) => ({
              sid: p.sid,
              address: p.messagingBinding?.address,
              proxyAddress: p.messagingBinding?.proxyAddress,
              identity: p.identity,
            })),
          });
        }
      } catch (err: any) {
        // Skip conversations where we can't fetch participants
        console.warn(`Could not fetch participants for conversation ${conversation.sid}:`, err.message);
      }
    }
    
    return {
      found: matchingConversations.length,
      conversations: matchingConversations,
    };
  } catch (error: any) {
    console.error('❌ Error searching Twilio for conversations:', error);
    const errorDetails: TwilioConversationError = {
      message: error.message || 'Failed to search Twilio for conversations',
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo,
    };
    return { error: errorDetails };
  }
}

/**
 * Alternative: Find existing Twilio conversation by searching through conversations
 * This is more efficient if you have many conversations
 * @deprecated Use findTwilioConversationByPhoneAPI instead
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

