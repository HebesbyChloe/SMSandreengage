import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from 'twilio';

async function validateTwilioWebhook(
  url: string,
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!signature) {
    return false;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return false;
  }

  try {
    return validateRequest(authToken, signature, url, body as any);
  } catch (error) {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate webhook signature
    const body = await request.text();
    const signature = request.headers.get('x-twilio-signature');
    const url = request.url;

    if (process.env.TWILIO_AUTH_TOKEN) {
      const isValid = await validateTwilioWebhook(url, body, signature);
      if (!isValid) {
        console.warn('Invalid status callback signature');
      }
    }

    // Parse status update
    const formData = new URLSearchParams(body);
    const messageSid = formData.get('MessageSid');
    const status = formData.get('MessageStatus');
    const errorCode = formData.get('ErrorCode');
    const errorMessage = formData.get('ErrorMessage');

    // Twilio status values: queued, sending, sent, failed, delivered, undelivered, received
    console.log(`📊 Twilio Status Update: ${messageSid} -> ${status}`, {
      errorCode: errorCode || 'none',
      errorMessage: errorMessage || 'none',
      timestamp: new Date().toISOString()
    });
    
    // Log failures prominently
    if (status === 'failed' || status === 'undelivered') {
      console.error(`❌ Message FAILED: ${messageSid}`, {
        status,
        errorCode,
        errorMessage,
        fullParams: Object.fromEntries(formData.entries())
      });
    }

    // Update message status in database
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/messages/status?messageSid=${messageSid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          errorCode: errorCode ? parseInt(errorCode) : null,
          errorMessage,
        }),
      });
    } catch (dbError) {
      console.error('Error updating message status:', dbError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Status callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

