import { NextRequest, NextResponse } from 'next/server';
import { hebesContacts } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// GET - Fetch all contacts
export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    console.log('Fetching contacts from Hebes API...', token ? 'with token' : 'without token');
    const contacts = await hebesContacts.getAll(token);
    
    // Hebes API returns array directly in data
    const contactsArray = Array.isArray(contacts) ? contacts : [contacts];
    
    // Sort by last_contacted_at or created_at descending
    const sortedContacts = contactsArray.sort((a: any, b: any) => {
      const aDate = new Date(a.last_contacted_at || a.created_at || 0).getTime();
      const bDate = new Date(b.last_contacted_at || b.created_at || 0).getTime();
      return bDate - aDate;
    });

    console.log(`Successfully fetched ${sortedContacts.length} contacts`);
    return NextResponse.json({ contacts: sortedContacts }, { status: 200 });
  } catch (error: any) {
    console.error('Exception retrieving contacts:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve contacts', 
      details: error.message,
    }, { status: 500 });
  }
}

// POST - Create new contact
export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    const body = await req.json();
    const { name, phone, country_code, area_code, timezone, crm_id, assigned_phone_number_id } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Clean and validate country_code - must be short (typically 1-3 digits) or null
    let cleanCountryCode: string | null = null;
    if (country_code) {
      const trimmed = country_code.trim();
      // Country codes are typically 1-3 digits, remove any + or other characters
      const digitsOnly = trimmed.replace(/[^\d]/g, '');
      if (digitsOnly && digitsOnly.length <= 3) {
        cleanCountryCode = digitsOnly;
      } else if (trimmed.length > 0 && trimmed.length <= 10) {
        // Allow short strings like "US", "CA" but limit length
        cleanCountryCode = trimmed.substring(0, 10);
      }
      // If too long or invalid, set to null
    }

    // Clean area_code - must be short or null
    let cleanAreaCode: string | null = null;
    if (area_code) {
      const trimmed = area_code.trim();
      if (trimmed && trimmed.length <= 10) {
        cleanAreaCode = trimmed;
      }
    }

    const contactData: any = {
      name: name || null,
      phone,
      country_code: cleanCountryCode,
      area_code: cleanAreaCode,
      timezone: timezone || null,
      crm_id: crm_id || null,
      assigned_phone_number_id: assigned_phone_number_id || null,
    };

    console.log('Creating contact with data:', contactData, token ? 'with token' : 'without token');
    
    try {
      const contact = await hebesContacts.create(contactData, token);
      console.log('✅ Contact created successfully:', contact);
      return NextResponse.json({ contact, success: true }, { status: 200 });
    } catch (apiError: any) {
      console.error('❌ Hebes API error creating contact:', apiError);
      
      // Check if it's a duplicate error
      const errorMessage = apiError?.message || String(apiError);
      if (errorMessage.includes('duplicate') || errorMessage.includes('already exists') || errorMessage.includes('unique')) {
        return NextResponse.json({ 
          error: 'A contact with this phone number already exists',
          details: errorMessage 
        }, { status: 409 });
      }
      
      // Re-throw to be caught by outer catch
      throw apiError;
    }
  } catch (error: any) {
    console.error('❌ Error creating contact:', error);
    
    const errorMessage = error?.message || String(error);
    
    // Check if it's a duplicate error (in case it wasn't caught above)
    if (errorMessage.includes('duplicate') || errorMessage.includes('already exists') || errorMessage.includes('unique')) {
      return NextResponse.json({ 
        error: 'A contact with this phone number already exists',
        details: errorMessage 
      }, { status: 409 });
    }
    
    // Provide more helpful error messages
    let userFriendlyError = 'Failed to create contact';
    if (errorMessage.includes('token') || errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
      userFriendlyError = 'Authentication failed. Please log in again.';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      userFriendlyError = 'Network error. Please check your connection and try again.';
    } else if (errorMessage) {
      userFriendlyError = errorMessage;
    }
    
    return NextResponse.json({ 
      error: userFriendlyError, 
      details: errorMessage 
    }, { status: 500 });
  }
}

