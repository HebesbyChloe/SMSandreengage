import { NextRequest, NextResponse } from 'next/server';
import { hebesContacts } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// GET - Get contact by phone number
export async function GET(req: NextRequest, { params }: { params: { phone: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const phone = decodeURIComponent(params.phone);
    const contact = await hebesContacts.getByPhone(phone, token);
    
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    
    return NextResponse.json({ contact }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching contact by phone:', error);
    return NextResponse.json({ error: 'Contact not found', details: error.message }, { status: 404 });
  }
}

