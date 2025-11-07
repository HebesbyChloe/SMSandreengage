import { NextRequest, NextResponse } from 'next/server';
import { hebesGet, hebesPost } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// GET - Get all phone numbers for a contact
export async function GET(req: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const contactId = params.contactId;
    
    // Get customer phone numbers from Hebes API
    const phoneNumbers = await hebesGet<any[]>(`customer_phone_numbers.php?contact_id=${contactId}`, token);
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

// POST - Create new phone number for a contact
export async function POST(req: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const contactId = params.contactId;
    const body = await req.json();
    const { phone_number, type, is_verified } = body;

    if (!phone_number) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const phoneData: any = {
      contact_id: contactId,
      phone_number,
      type: type || 'primary',
      is_verified: is_verified || false,
    };

    const phoneNumber = await hebesPost<any>('customer_phone_numbers.php', phoneData, token);
    
    return NextResponse.json({ phoneNumber, success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error creating phone number:', error);
    return NextResponse.json({ error: 'Failed to create phone number', details: error.message }, { status: 500 });
  }
}

