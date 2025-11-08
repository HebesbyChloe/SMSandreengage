import { NextRequest, NextResponse } from 'next/server';
import { hebesSenderPhoneNumbers } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Fetch all sender phone numbers
export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    console.log('Fetching sender phone numbers from Hebes API...', token ? 'with token' : 'without token');
    const phoneNumbers = await hebesSenderPhoneNumbers.getAll(token);
    
    const phoneNumbersArray = Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers];
    
    // Sort by created_at descending
    const sortedPhones = phoneNumbersArray.sort((a: any, b: any) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    });

    console.log(`Successfully fetched ${sortedPhones.length} sender phone numbers`);
    return NextResponse.json({ phoneNumbers: sortedPhones }, { status: 200 });
  } catch (error: any) {
    console.error('Exception retrieving sender phone numbers:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve sender phone numbers', 
      details: error.message,
    }, { status: 500 });
  }
}

