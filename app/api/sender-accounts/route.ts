import { NextRequest, NextResponse } from 'next/server';
import { hebesSenderAccounts } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// GET - Fetch all sender accounts
export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    console.log('Fetching sender accounts from Hebes API...', token ? 'with token' : 'without token');
    const accounts = await hebesSenderAccounts.getAll(token);
    
    // Hebes API returns array directly in data, but we need to handle both single object and array
    const accountsArray = Array.isArray(accounts) ? accounts : [accounts];
    
    // Sort by created_at descending (if available)
    const sortedAccounts = accountsArray.sort((a: any, b: any) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    });

    console.log(`Successfully fetched ${sortedAccounts.length} sender accounts`);
    return NextResponse.json({ accounts: sortedAccounts }, { status: 200 });
  } catch (error: any) {
    console.error('Exception retrieving sender accounts:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve sender accounts', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// POST - Create new sender account
export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    const body = await req.json();
    const { account_name, account_sid, auth_token, webhook_url, pre_webhook_url } = body;

    if (!account_name || !account_sid || !auth_token) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Extract user ID from JWT token (if available)
    let userId: number | null = null;
    if (token) {
      try {
        // Decode JWT token to get user ID (simple base64 decode of payload)
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          userId = payload.id || payload.user_id || payload.userId || null;
        }
      } catch (e) {
        console.warn('Could not extract user ID from token:', e);
      }
    }

    // Map to Hebes API format (matching the expected format)
    const accountData: any = {
      account_name,
      provider: 'twilio',
      account_sid,
      auth_token,
      is_active: 1, // Use 1 instead of true (number, not boolean)
    };

    // Add user ID if available
    if (userId) {
      accountData.id = userId;
    }

    // Hebes API uses 'settings' JSON field for additional config
    const settings: any = {};
    if (webhook_url) {
      settings.callback_url = webhook_url;
    }
    if (pre_webhook_url) {
      settings.pre_webhook_url = pre_webhook_url;
    }
    
    // Only add settings if it has any values
    if (Object.keys(settings).length > 0) {
      accountData.settings = settings;
    }

    console.log('Creating sender account with data:', { 
      ...accountData, 
      auth_token: '***',
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });
    
    try {
      const account = await hebesSenderAccounts.create(accountData, token);
      console.log('Account created successfully:', account);
      
      return NextResponse.json({ account, success: true }, { status: 200 });
    } catch (createError: any) {
      console.error('Error in hebesSenderAccounts.create:', createError);
      console.error('Error type:', typeof createError);
      console.error('Error message:', createError?.message);
      console.error('Error stack:', createError?.stack);
      
      // Re-throw to be caught by outer catch
      throw createError;
    }
  } catch (error: any) {
    console.error('Error creating sender account:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    });
    
    // Check if it's a duplicate error
    if (error.message && (error.message.includes('duplicate') || error.message.includes('already exists'))) {
      return NextResponse.json({ error: 'An account with this SID already exists' }, { status: 409 });
    }
    
    // Return the actual error message from Hebes API
    const errorMessage = error.message || 'Failed to create sender account';
    return NextResponse.json({ 
      error: 'Failed to create sender account', 
      details: errorMessage,
      // Include more details in development
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        name: error.name,
      }),
    }, { status: 500 });
  }
}

