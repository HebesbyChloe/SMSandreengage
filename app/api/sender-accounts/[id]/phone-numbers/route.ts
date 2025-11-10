import { NextRequest, NextResponse } from 'next/server';
import { hebesSenderPhoneNumbers } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// GET - Get all phone numbers for a sender account
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const accountId = params.id;
    
    const phoneNumbers = await hebesSenderPhoneNumbers.getByAccountId(accountId, token);
    const phoneNumbersArray = Array.isArray(phoneNumbers) ? phoneNumbers : [];
    
    // Sort by created_at ascending
    const sortedPhones = phoneNumbersArray.sort((a: any, b: any) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return aDate - bDate;
    });

    return NextResponse.json({ phoneNumbers: sortedPhones }, { status: 200 });
  } catch (error: any) {
    console.error('Error retrieving phone numbers:', error);
    return NextResponse.json({ error: 'Failed to retrieve phone numbers', details: error.message }, { status: 500 });
  }
}

// POST - Create new phone number for a sender account
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const accountId = params.id;
    const body = await req.json();
    const { phone_number, friendly_name, is_primary, is_active } = body;

    if (!phone_number) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const phoneData: any = {
      account_id: accountId,
      phone_number,
      friendly_name: friendly_name || phone_number,
      // Convert boolean to numeric (1/0) for Hebes API compatibility
      is_primary: (is_primary || false) ? 1 : 0,
      is_active: (is_active !== undefined ? is_active : true) ? 1 : 0,
    };

    const phoneNumber = await hebesSenderPhoneNumbers.create(phoneData, token);
    
    return NextResponse.json({ phoneNumber, success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error creating phone number:', error);
    return NextResponse.json({ error: 'Failed to create phone number', details: error.message }, { status: 500 });
  }
}

