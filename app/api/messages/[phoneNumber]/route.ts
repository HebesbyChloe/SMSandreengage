import { NextRequest, NextResponse } from 'next/server';
import { hebesSmsMessages } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// GET - Get messages for a specific conversation ID or phone number (backward compatibility)
export async function GET(req: NextRequest, { params }: { params: { phoneNumber: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const phoneNumberOrConversationId = decodeURIComponent(params.phoneNumber);
    const { searchParams } = new URL(req.url);
    const senderPhone = searchParams.get('senderPhone');
    const useConversationId = searchParams.get('useConversationId') === 'true';

    console.log(`Fetching messages for ${phoneNumberOrConversationId}`, senderPhone ? `(sender: ${senderPhone})` : '', useConversationId ? '(by conversation_id)' : '(by phone)', token ? 'with token' : 'without token');

    let filteredMessages: any[] = [];

    if (useConversationId) {
      // Fetch messages by conversation_id
      try {
        filteredMessages = await hebesSmsMessages.getByConversation(phoneNumberOrConversationId, token);
        if (!Array.isArray(filteredMessages)) {
          filteredMessages = [];
        }
      } catch (error) {
        console.error('Error fetching messages by conversation_id:', error);
        filteredMessages = [];
      }
    } else {
      // Legacy: Filter messages for this phone number (backward compatibility)
      const allMessages = await hebesSmsMessages.getAll(token);
      const messagesArray = Array.isArray(allMessages) ? allMessages : [];

      // Filter messages for this phone number
      filteredMessages = messagesArray.filter((msg: any) => {
        const isInbound = msg.direction === 'inbound' && msg.from_number === phoneNumberOrConversationId;
        const isOutbound = msg.direction === 'outbound' && msg.to_number === phoneNumberOrConversationId;
        return isInbound || isOutbound;
      });

      // Filter by sender phone if specified
      if (senderPhone) {
        filteredMessages = filteredMessages.filter((msg: any) => {
          if (msg.direction === 'outbound') {
            return msg.from_number === senderPhone;
          } else {
            return msg.to_number === senderPhone;
          }
        });
      }
    }

    // Sort by timestamp (oldest first)
    filteredMessages.sort((a: any, b: any) => {
      const timeA = new Date(a.received_at || a.sent_at || a.created_at || 0).getTime();
      const timeB = new Date(b.received_at || b.sent_at || b.created_at || 0).getTime();
      return timeA - timeB;
    });

    // Map to expected format
    const messages = filteredMessages.map((msg: any) => ({
      id: msg.id,
      direction: msg.direction,
      from: msg.from_number,
      to: msg.to_number,
      body: msg.body,
      status: msg.status,
      timestamp: msg.received_at || msg.sent_at || msg.created_at,
      mediaCount: msg.media_count || 0,
      providerMessageSid: msg.provider_message_sid,
    }));

    console.log(`Returning ${messages.length} messages for ${phoneNumberOrConversationId}`);
    return NextResponse.json({ messages }, { status: 200 });
  } catch (error: any) {
    console.error('Exception retrieving messages:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve messages', 
      details: error.message,
    }, { status: 500 });
  }
}

