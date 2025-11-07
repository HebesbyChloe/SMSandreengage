import { NextRequest, NextResponse } from 'next/server';
import { hebesSmsMessages } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// POST - Create new message (used by webhook and send routes)
export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    const body = await req.json();
    const {
      direction,
      fromNumber,
      toNumber,
      body: messageBody,
      status,
      provider,
      providerMessageSid,
      mediaCount,
      senderPhoneNumberId,
      conversationId,
      userId,
    } = body;

    if (!direction || !fromNumber || !toNumber || messageBody === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const messageData: any = {
      direction,
      from_number: fromNumber,
      to_number: toNumber,
      body: messageBody,
      status: status || (direction === 'inbound' ? 'received' : 'queued'),
      provider: provider || 'twilio',
      media_count: mediaCount || 0,
    };

    if (providerMessageSid) {
      messageData.provider_message_sid = providerMessageSid;
      messageData.provider_payload = { sid: providerMessageSid };
    }

    if (senderPhoneNumberId) messageData.sender_phone_number_id = senderPhoneNumberId;
    if (conversationId) messageData.conversation_id = conversationId;
    if (userId) messageData.user_id = userId;

    // Set timestamps based on direction
    const now = new Date().toISOString();
    if (direction === 'inbound') {
      messageData.received_at = now;
    } else {
      messageData.sent_at = now;
    }

    const message = await hebesSmsMessages.create(messageData, token);
    
    return NextResponse.json({ message, success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error creating message:', error);
    return NextResponse.json({ error: 'Failed to create message', details: error.message }, { status: 500 });
  }
}

