import { NextRequest, NextResponse } from 'next/server';
import { hebesSmsMessages, hebesSenderPhoneNumbers, hebesContacts } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// GET - Get all conversations (unique phone numbers with last message)
export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    const { searchParams } = new URL(req.url);
    const senderPhoneFilter = searchParams.get('senderPhone');

    console.log('Fetching conversations from Hebes API...', senderPhoneFilter ? `Filter: ${senderPhoneFilter}` : 'No filter', token ? 'with token' : 'without token');

    // Get all active sender phone numbers
    const senderPhones = await hebesSenderPhoneNumbers.getAll(token);
    const senderPhonesArray = Array.isArray(senderPhones) ? senderPhones : [];
    const activeSenderPhones = senderPhonesArray.filter((p: any) => p.is_active);
    const senderPhoneNumbers = new Set(activeSenderPhones.map((p: any) => p.phone_number));
    const senderPhoneIdMap = new Map(activeSenderPhones.map((p: any) => [p.id, p.phone_number]));

    // Get all messages
    const allMessages = await hebesSmsMessages.getAll(token);
    const messagesArray = Array.isArray(allMessages) ? allMessages : [];

    // Group messages by conversation_id (primary) - ensure all messages with same conversation_id are grouped together
    const messagesByConversation = new Map<string, any[]>();
    const lastMessages = new Map<string, any>();
    const conversationSenderPhones = new Map<string, Set<string>>();
    const conversationCustomerPhones = new Map<string, Set<string>>(); // Track all customer phones per conversation
    const conversationPhoneCounts = new Map<string, Map<string, number>>(); // Count occurrences of each phone

    for (const message of messagesArray) {
      // Skip messages with invalid data
      if (!message || (!message.conversation_id && !message.from_number && !message.to_number)) {
        continue;
      }

      // Use conversation_id if available, otherwise use customer phone as fallback
      // IMPORTANT: All messages with the same conversation_id must be grouped together
      const conversationKey = message.conversation_id || 
        (message.direction === 'inbound' ? message.from_number : message.to_number);
      
      // Skip if conversationKey is null or empty
      if (!conversationKey) {
        continue;
      }
      
      const customerPhone = message.direction === 'inbound' ? message.from_number : message.to_number;
      
      // Skip if customerPhone is null or empty
      if (!customerPhone) {
        continue;
      }
      
      if (!messagesByConversation.has(conversationKey)) {
        messagesByConversation.set(conversationKey, []);
        conversationSenderPhones.set(conversationKey, new Set());
        conversationCustomerPhones.set(conversationKey, new Set());
        conversationPhoneCounts.set(conversationKey, new Map());
      }

      messagesByConversation.get(conversationKey)!.push(message);

      // Track all customer phones for this conversation
      conversationCustomerPhones.get(conversationKey)!.add(customerPhone);
      
      // Count occurrences of each customer phone (to find the most common one)
      const phoneCounts = conversationPhoneCounts.get(conversationKey)!;
      phoneCounts.set(customerPhone, (phoneCounts.get(customerPhone) || 0) + 1);

      // Track sender phones for this conversation
      if (message.sender_phone_number_id && senderPhoneIdMap.has(message.sender_phone_number_id)) {
        conversationSenderPhones.get(conversationKey)!.add(senderPhoneIdMap.get(message.sender_phone_number_id)!);
      } else if (message.direction === 'outbound' && senderPhoneNumbers.has(message.from_number)) {
        conversationSenderPhones.get(conversationKey)!.add(message.from_number);
      } else if (message.direction === 'inbound' && senderPhoneNumbers.has(message.to_number)) {
        conversationSenderPhones.get(conversationKey)!.add(message.to_number);
      }

      // Track last message
      const existingLast = lastMessages.get(conversationKey);
      const messageTime = new Date(message.received_at || message.sent_at || message.created_at || 0).getTime();
      if (!existingLast || messageTime > new Date(existingLast.timestamp || 0).getTime()) {
        lastMessages.set(conversationKey, {
          body: message.body,
          timestamp: message.received_at || message.sent_at || message.created_at,
          direction: message.direction,
        });
      }
    }

    // Get all contacts
    let contactsMap = new Map<string, any>();
    try {
      const contacts = await hebesContacts.getAll(token);
      const contactsArray = Array.isArray(contacts) ? contacts : [];
      contactsArray.forEach((contact: any) => {
        // Skip contacts with null or empty phone
        if (!contact || !contact.phone) {
          return;
        }
        // Store contact by phone number (normalize for matching)
        contactsMap.set(contact.phone, contact);
        // Also store with + prefix if not present (for better matching)
        if (typeof contact.phone === 'string' && !contact.phone.startsWith('+')) {
          contactsMap.set(`+${contact.phone}`, contact);
        }
      });
    } catch (error) {
      console.warn('Could not fetch contacts:', error);
    }

    // Helper function to find contact for a conversation
    const findContactForConversation = (customerPhones: Set<string>): any | null => {
      // Try to find contact by checking all customer phones in the conversation
      for (const phone of customerPhones) {
        // Skip null or empty phones
        if (!phone || typeof phone !== 'string') {
          continue;
        }
        const contact = contactsMap.get(phone);
        if (contact) {
          return contact;
        }
        // Try without + prefix
        const phoneWithoutPlus = phone.startsWith('+') ? phone.slice(1) : phone;
        if (phoneWithoutPlus) {
          const contact2 = contactsMap.get(phoneWithoutPlus);
          if (contact2) {
            return contact2;
          }
        }
      }
      return null;
    };

    // Helper function to get the primary customer phone (most common one)
    const getPrimaryCustomerPhone = (conversationKey: string): string => {
      const customerPhones = conversationCustomerPhones.get(conversationKey);
      if (!customerPhones || customerPhones.size === 0) {
        return conversationKey;
      }
      
      // If only one phone, use it
      if (customerPhones.size === 1) {
        return Array.from(customerPhones)[0];
      }
      
      // Find the most common phone number
      const phoneCounts = conversationPhoneCounts.get(conversationKey)!;
      let maxCount = 0;
      let primaryPhone = Array.from(customerPhones)[0];
      
      for (const [phone, count] of phoneCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          primaryPhone = phone;
        }
      }
      
      return primaryPhone;
    };

    // Build conversations - grouped by conversation_id, show contact name if available
    // Filter out empty conversations (no messages)
    const conversations = Array.from(messagesByConversation.keys())
      .filter(conversationKey => {
        const messages = messagesByConversation.get(conversationKey);
        // Only include conversations that have at least one message
        return messages && messages.length > 0;
      })
      .map(conversationKey => {
        const customerPhones = conversationCustomerPhones.get(conversationKey) || new Set<string>();
        const primaryCustomerPhone = getPrimaryCustomerPhone(conversationKey);
        const contact = findContactForConversation(customerPhones);
        
        return {
          conversationId: conversationKey, // Use conversation_id as the identifier (groups messages together)
          phoneNumber: primaryCustomerPhone, // Primary customer phone for display/contact lookup
          lastMessage: lastMessages.get(conversationKey),
          contact: contact, // Contact info if available (will show name in UI)
          senderPhones: Array.from(conversationSenderPhones.get(conversationKey) || []),
        };
      })
      .sort((a, b) => {
        const timeA = new Date(a.lastMessage?.timestamp || 0).getTime();
        const timeB = new Date(b.lastMessage?.timestamp || 0).getTime();
        return timeB - timeA;
      });

    // Filter by sender phone if specified
    let filteredConversations = conversations;
    if (senderPhoneFilter) {
      filteredConversations = conversations.filter(conv => 
        conv.senderPhones.includes(senderPhoneFilter)
      );
    }

    console.log(`Returning ${filteredConversations.length} conversations`);
    return NextResponse.json({ conversations: filteredConversations }, { status: 200 });
  } catch (error: any) {
    console.error('Exception retrieving conversations:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve conversations', 
      details: error.message,
    }, { status: 500 });
  }
}

