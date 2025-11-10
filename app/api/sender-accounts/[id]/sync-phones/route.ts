import { NextRequest, NextResponse } from 'next/server';
import { hebesSenderAccounts, hebesSyncSenderNumbers } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

/**
 * POST /api/sender-accounts/[id]/sync-phones
 * Sync phone numbers from Twilio API to database via Hebes Backend API
 * 
 * Flow:
 * 1. Validate account exists
 * 2. Call Hebes Backend API (sender_numbers_sync.php) which handles:
 *    - Fetching credentials from database
 *    - Calling Twilio API
 *    - Syncing phone numbers to database
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const accountId = params.id;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }


    // Step 1: Verify account exists
    try {
      const account = await hebesSenderAccounts.getById(accountId, token);
    } catch (error: any) {
      console.error('❌ Account not found:', error.message);
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Step 2: Call Hebes Backend API to sync phone numbers
    
    try {
      const result = await hebesSyncSenderNumbers(accountId, token);
      

      return NextResponse.json({ 
        phoneNumbers: result.data.list, 
        success: true,
        summary: result.data.summary,
        details: result.data.details,
        count: result.data.list.length,
        totalFound: result.data.summary.fetched_from_twilio
      }, { status: 200 });
    } catch (error: any) {
      console.error('❌ Hebes Backend API error:', error.message);
      return NextResponse.json({ 
        error: 'Failed to sync phone numbers', 
        details: error.message
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('❌ Error syncing phone numbers:', error);
    return NextResponse.json({ 
      error: 'Failed to sync phone numbers', 
      details: error.message 
    }, { status: 500 });
  }
}
