import { NextRequest, NextResponse } from 'next/server';
import { hebesSmsMessages } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// PUT - Update message status by provider message SID
export async function PUT(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    const { searchParams } = new URL(req.url);
    const messageSid = searchParams.get('messageSid');
    const body = await req.json();
    const { status, errorCode, errorMessage } = body;

    if (!messageSid) {
      return NextResponse.json({ error: 'Message SID is required' }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Get all messages to find the one with this provider_message_sid
    const allMessages = await hebesSmsMessages.getAll(token);
    const messagesArray = Array.isArray(allMessages) ? allMessages : [];
    const message = messagesArray.find((m: any) => m.provider_message_sid === messageSid);

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Update the message
    const updateData: any = {
      id: message.id,
      status,
    };

    if (errorCode !== undefined) {
      updateData.provider_error_code = errorCode.toString();
    }

    if (errorMessage) {
      updateData.provider_payload = {
        ...(message.provider_payload || {}),
        error_code: errorCode,
        error_message: errorMessage,
      };
    }

    // Set delivered_at or failed_at based on status
    // Twilio statuses: queued, sending, sent, failed, delivered, undelivered, received
    const now = new Date().toISOString();
    if (status === 'delivered') {
      updateData.delivered_at = now;
    } else if (status === 'failed' || status === 'undelivered') {
      updateData.failed_at = now;
      console.error('❌ Message failed/undelivered:', messageSid, {
        status,
        errorCode,
        errorMessage
      });
    } else if (status === 'sent') {
    }

    const updatedMessage = await hebesSmsMessages.update(updateData, token);
    
    return NextResponse.json({ message: updatedMessage, success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating message status:', error);
    return NextResponse.json({ error: 'Failed to update message status', details: error.message }, { status: 500 });
  }
}

