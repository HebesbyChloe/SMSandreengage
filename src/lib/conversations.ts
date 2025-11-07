/**
 * Conversation helper functions
 * Handles finding or creating conversation IDs for messages
 */

import { hebesSmsMessages, hebesConversationMeta } from './hebes-api';

/**
 * Find or create a conversation ID for a phone number
 * Conversations are identified by the customer phone number
 * Returns the conversation_id (which is the root message ID or conversation_meta ID)
 */
export async function findOrCreateConversationId(
  customerPhone: string,
  senderPhoneNumberId?: string,
  token?: string | null
): Promise<string | null> {
  try {
    // First, try to find existing messages for this customer phone
    const allMessages = await hebesSmsMessages.getAll(token);
    const messagesArray = Array.isArray(allMessages) ? allMessages : [];
    
    // Format customer phone for consistent matching
    const formattedCustomerPhone = customerPhone.startsWith('+') ? customerPhone : `+${customerPhone}`;
    
    // Find messages for this customer (inbound: from_number, outbound: to_number)
    const existingMessages = messagesArray.filter((msg: any) => {
      if (!msg) return false;
      const msgCustomerPhone = msg.direction === 'inbound' ? msg.from_number : msg.to_number;
      // Match with or without + prefix
      return msgCustomerPhone === customerPhone || 
             msgCustomerPhone === formattedCustomerPhone ||
             (msgCustomerPhone && customerPhone && msgCustomerPhone.replace(/\D/g, '') === customerPhone.replace(/\D/g, ''));
    });

    // If we have existing messages, use the conversation_id from the first one
    // Prioritize Twilio conversation SIDs (start with "CH") as they're the unified way
    if (existingMessages.length > 0) {
      // First, try to find a message with a Twilio conversation SID
      const messageWithTwilioConversation = existingMessages.find((msg: any) => 
        msg.conversation_id && typeof msg.conversation_id === 'string' && msg.conversation_id.startsWith('CH')
      );
      
      if (messageWithTwilioConversation && messageWithTwilioConversation.conversation_id) {
        console.log('✅ Found existing Twilio conversation ID:', messageWithTwilioConversation.conversation_id);
        return messageWithTwilioConversation.conversation_id;
      }
      
      // Otherwise, use the conversation_id from the first message
      const firstMessage = existingMessages[0];
      if (firstMessage.conversation_id) {
        console.log('✅ Found existing conversation ID:', firstMessage.conversation_id);
        return firstMessage.conversation_id;
      }
      
      // If no conversation_id, use the first message's ID as the conversation root
      console.log('✅ Using first message ID as conversation root:', firstMessage.id);
      return firstMessage.id;
    }

    // No existing messages - we'll create a conversation when the first message is created
    // For now, return null and let the message creation handle it
    // The conversation_id will be set to the message's own ID for the first message
    return null;
  } catch (error) {
    console.error('Error finding conversation:', error);
    return null;
  }
}

/**
 * Get conversation ID from existing messages or create new one
 * This is called before sending a message to ensure we have a conversation_id
 */
export async function ensureConversationId(
  customerPhone: string,
  senderPhoneNumberId?: string
): Promise<string> {
  const existingId = await findOrCreateConversationId(customerPhone, senderPhoneNumberId);
  
  // If we found an existing conversation, return it
  if (existingId) {
    return existingId;
  }
  
  // For new conversations, we'll use the message ID as the conversation_id
  // This will be set when the message is created
  // Return a placeholder - the actual conversation_id will be the message's own ID
  // We'll handle this in the message creation by setting conversation_id = message.id for first message
  return ''; // Empty string means "create new conversation with message ID"
}

