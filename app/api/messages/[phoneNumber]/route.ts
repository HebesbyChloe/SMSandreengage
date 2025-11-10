import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/api-helpers';

// GET - Get messages for a specific conversation ID or phone number
// This route proxies directly to PHP API: sms_messages.php
export async function GET(req: NextRequest, { params }: { params: { phoneNumber: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const phoneNumberOrConversationId = decodeURIComponent(params.phoneNumber);
    const { searchParams } = new URL(req.url);
    const senderPhone = searchParams.get('senderPhone');
    const useConversationId = searchParams.get('useConversationId') === 'true';

    // Build PHP API URL
    const HEBES_API_BASE = process.env.NEXT_PUBLIC_HEBES_API_BASE || 
      'https://admin.hebesbychloe.com/wp-content/themes/flatsome-child/backend-dfcflow/twilio';
    
    let phpApiUrl = `${HEBES_API_BASE}/sms_messages.php`;
    
    // Add query parameters based on request type
    if (useConversationId) {
      // Fetch by conversation_id
      phpApiUrl += `?conversation_id=${encodeURIComponent(phoneNumberOrConversationId)}`;
    } else {
      // Legacy: Fetch by phone number
      // PHP API should handle filtering by phone number
      phpApiUrl += `?phone_number=${encodeURIComponent(phoneNumberOrConversationId)}`;
    }
    
    // Add sender phone filter if provided
    if (senderPhone) {
      phpApiUrl += `&sender_phone=${encodeURIComponent(senderPhone)}`;
    }

    // Call PHP API directly
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(phpApiUrl, {
      method: 'GET',
      headers,
    });

    const responseText = await response.text();
    let result: any;
    
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response from PHP API: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok || !result.success) {
      const errorMessage = typeof result.data === 'string' 
        ? result.data 
        : (result.data ? JSON.stringify(result.data) : `HTTP ${response.status}`);
      throw new Error(errorMessage);
    }

    // PHP API returns data in result.data (could be array or object with messages array)
    let messages = [];
    if (Array.isArray(result.data)) {
      messages = result.data;
    } else if (result.data && Array.isArray(result.data.messages)) {
      messages = result.data.messages;
    } else if (result.data && Array.isArray(result.data.data)) {
      messages = result.data.data;
    }

    // Sort by timestamp (oldest first)
    messages.sort((a: any, b: any) => {
      const timeA = new Date(a.received_at || a.sent_at || a.created_at || 0).getTime();
      const timeB = new Date(b.received_at || b.sent_at || b.created_at || 0).getTime();
      return timeA - timeB;
    });

    // Map to expected format
    const formattedMessages = messages.map((msg: any) => ({
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

    return NextResponse.json({ messages: formattedMessages }, { status: 200 });
  } catch (error: any) {
    console.error('Exception retrieving messages:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve messages', 
      details: error.message,
    }, { status: 500 });
  }
}

