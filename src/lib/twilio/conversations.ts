/**
 * Twilio Conversations API utilities
 * Handles finding or creating Twilio Conversations and adding participants
 */

import { createTwilioClient, formatPhoneNumber } from './client';
import { hebesSenderAccounts, hebesSenderPhoneNumbers, hebesSmsMessages } from '../hebes-api';

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

    // Check if we already have a Twilio conversation SID stored in our messages
    const allMessages = await hebesSmsMessages.getAll(token);
    const messagesArray = Array.isArray(allMessages) ? allMessages : [];
    
    // Find existing messages for this customer (check both directions)
    const existingMessages = messagesArray.filter((msg: any) => {
      if (!msg) return false;
      // Check if message is related to this customer phone
      const msgCustomerPhone = msg.direction === 'inbound' ? msg.from_number : msg.to_number;
      return msgCustomerPhone === formattedCustomerPhone;
    });

    // Check if any message has a Twilio conversation SID
    // Twilio Conversation SIDs start with "CH" (e.g., "CHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
    for (const msg of existingMessages) {
      let conversationSid: string | null = null;
      
      // Check conversation_id - if it starts with "CH", it's a Twilio conversation SID
      if (msg.conversation_id && typeof msg.conversation_id === 'string' && msg.conversation_id.startsWith('CH')) {
        conversationSid = msg.conversation_id;
        console.log('✅ Found existing Twilio conversation SID in conversation_id:', conversationSid);
      }
      // Also check provider_conversation_sid and conversation_sid fields
      else if (msg.provider_conversation_sid && typeof msg.provider_conversation_sid === 'string' && msg.provider_conversation_sid.startsWith('CH')) {
        conversationSid = msg.provider_conversation_sid;
        console.log('✅ Found existing Twilio conversation SID in provider_conversation_sid:', conversationSid);
      }
      else if (msg.conversation_sid && typeof msg.conversation_sid === 'string' && msg.conversation_sid.startsWith('CH')) {
        conversationSid = msg.conversation_sid;
        console.log('✅ Found existing Twilio conversation SID in conversation_sid:', conversationSid);
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

      // Add participants to the conversation - BOTH are required for messages to work
      // The proxyAddress should be the Twilio phone number (sender phone) for both participants
      
      let participantsAdded = 0;
      const errors: string[] = [];

      // Add customer (recipient) - this is the phone number we're sending to
      // Both address and proxyAddress are required
      try {
        await twilioClient.conversations.v1
          .conversations(conversationSid)
          .participants
          .create({
            'messagingBinding.address': formattedCustomerPhone,
            'messagingBinding.proxyAddress': formattedSenderPhone, // Twilio phone number
          });
        console.log('✅ Added customer participant:', formattedCustomerPhone, 'via proxy:', formattedSenderPhone);
        participantsAdded++;
      } catch (participantError: any) {
        const errorMsg = `Failed to add customer participant: ${participantError.message}`;
        console.error('❌', errorMsg);
        console.error('Error details:', {
          code: participantError.code,
          status: participantError.status,
          moreInfo: participantError.moreInfo,
        });
        errors.push(errorMsg);
      }

      // Add sender (Twilio phone number) - this is your Twilio phone number
      // The sender also needs to be a participant
      try {
        await twilioClient.conversations.v1
          .conversations(conversationSid)
          .participants
          .create({
            'messagingBinding.address': formattedSenderPhone,
            'messagingBinding.proxyAddress': formattedSenderPhone, // Same as address for sender
          });
        console.log('✅ Added sender participant:', formattedSenderPhone);
        participantsAdded++;
      } catch (participantError: any) {
        const errorMsg = `Failed to add sender participant: ${participantError.message}`;
        console.error('❌', errorMsg);
        console.error('Error details:', {
          code: participantError.code,
          status: participantError.status,
          moreInfo: participantError.moreInfo,
        });
        errors.push(errorMsg);
      }

      // If we couldn't add at least the customer participant, the conversation won't work
      if (participantsAdded === 0) {
        console.error('❌ Failed to add any participants to conversation. Conversation will not work.');
        console.error('Errors:', errors);
        // Still return the conversation SID - the caller can decide what to do
        // But log a warning that messages won't work without participants
        return conversationSid;
      }

      if (participantsAdded < 2) {
        console.warn('⚠️ Only added', participantsAdded, 'of 2 participants. Conversation may not work properly.');
      } else {
        console.log('✅ Successfully added both participants to conversation');
      }

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

    let needsCustomer = !participantAddresses.has(customerPhone);
    let needsSender = !participantAddresses.has(senderPhone);

    if (!needsCustomer && !needsSender) {
      console.log('✅ All participants already exist in conversation');
      return;
    }

    // Add missing customer participant
    if (needsCustomer) {
      try {
        await twilioClient.conversations.v1
          .conversations(conversationSid)
          .participants
          .create({
            'messagingBinding.address': customerPhone,
            'messagingBinding.proxyAddress': senderPhone,
          });
        console.log('✅ Added missing customer participant:', customerPhone);
      } catch (error: any) {
        console.error('⚠️ Error adding customer participant to existing conversation:', error.message);
      }
    }

    // Add missing sender participant
    if (needsSender) {
      try {
        await twilioClient.conversations.v1
          .conversations(conversationSid)
          .participants
          .create({
            'messagingBinding.address': senderPhone,
            'messagingBinding.proxyAddress': senderPhone,
          });
        console.log('✅ Added missing sender participant:', senderPhone);
      } catch (error: any) {
        console.error('⚠️ Error adding sender participant to existing conversation:', error.message);
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

