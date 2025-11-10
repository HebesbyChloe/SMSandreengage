import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from 'twilio';
import { findOrCreateConversationId } from '@/lib/conversations';
import { hebesSmsMessages } from '@/lib/hebes-api';

// Validate webhook signature
async function validateTwilioWebhook(
  url: string,
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!signature) {
    return false;
  }

  // Get auth token from environment or database
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error('TWILIO_AUTH_TOKEN not configured');
    return false;
  }

  try {
    return validateRequest(authToken, signature, url, body as any);
  } catch (error) {
    console.error('Webhook validation error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature validation
    const body = await request.text();
    const signature = request.headers.get('x-twilio-signature');
    const url = request.url;

    // Validate webhook signature (security)
    // Note: In production, always validate. For now, we'll make it optional
    if (process.env.TWILIO_AUTH_TOKEN) {
      const isValid = await validateTwilioWebhook(url, body, signature);
      if (!isValid) {
        console.warn('Invalid webhook signature - continuing anyway for development');
        // return NextResponse.json(
        //   { error: 'Invalid webhook signature' },
        //   { status: 403 }
        // );
      }
    }

    // Parse form data
    const formData = new URLSearchParams(body);
    const from = formData.get('From');
    const to = formData.get('To');
    const messageBody = formData.get('Body');
    const messageSid = formData.get('MessageSid');
    const messageStatus = formData.get('SmsStatus');
    const numMedia = formData.get('NumMedia') || '0';
    const accountSid = formData.get('AccountSid');


    // Find sender phone number ID from the 'to' number
    let senderPhoneNumberId = null;
    try {
      const { hebesSenderPhoneNumbers } = await import('@/lib/hebes-api');
      const phoneNumbers = await hebesSenderPhoneNumbers.getAll();
      const phoneNumbersArray = Array.isArray(phoneNumbers) ? phoneNumbers : [];
      const matchingPhone = phoneNumbersArray.find((p: any) => p.phone_number === to);
      if (matchingPhone) {
        senderPhoneNumberId = matchingPhone.id;
      }
    } catch (error) {
      console.warn('Could not find sender phone number:', error);
    }

        // Note: Webhooks don't have auth tokens, but we can try to get from env or use null
        // The Hebes API might allow webhook calls without auth, or we need to configure a service token
        const token = null; // Webhooks typically don't have user tokens

        // Find or create conversation ID for incoming message
        const conversationId = await findOrCreateConversationId(from || '', senderPhoneNumberId || undefined, token);

        // Store incoming message with conversation_id
        try {
          const messageData: any = {
            direction: 'inbound',
            fromNumber: from,
            toNumber: to,
            body: messageBody,
            status: messageStatus || 'received',
            provider: 'twilio',
            providerMessageSid: messageSid,
            mediaCount: parseInt(numMedia, 10),
            senderPhoneNumberId,
          };

          // Create message first to get its ID
          const createdMessage = await hebesSmsMessages.create(messageData, token);
      
      // If this is a new conversation (no conversationId), set conversation_id to the message's own ID
      if (!conversationId && createdMessage.id) {
        // Update the message to set conversation_id to its own ID (root message)
        await hebesSmsMessages.update({
          id: createdMessage.id,
          conversation_id: createdMessage.id,
        }, token);
      } else if (conversationId) {
        // Update existing conversation with conversation_id
        await hebesSmsMessages.update({
          id: createdMessage.id,
          conversation_id: conversationId,
        }, token);
      }
    } catch (dbError) {
      console.error('Error storing incoming message:', dbError);
    }

    // Return empty TwiML response
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

