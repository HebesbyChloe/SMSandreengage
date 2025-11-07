import { NextRequest, NextResponse } from 'next/server';
import { hebesContacts } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// GET - Get contact by ID
export async function GET(req: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const id = params.contactId;
    const contact = await hebesContacts.getById(id, token);
    return NextResponse.json({ contact }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching contact:', error);
    return NextResponse.json({ error: 'Contact not found', details: error.message }, { status: 404 });
  }
}

// PUT - Update contact
export async function PUT(req: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const id = params.contactId;
    const body = await req.json();

    const updateData: any = {
      id,
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    
    // Clean and validate country_code
    if (body.country_code !== undefined) {
      if (!body.country_code || body.country_code.trim() === '') {
        updateData.country_code = null;
      } else {
        const trimmed = body.country_code.trim();
        const digitsOnly = trimmed.replace(/[^\d]/g, '');
        if (digitsOnly && digitsOnly.length <= 3) {
          updateData.country_code = digitsOnly;
        } else if (trimmed.length > 0 && trimmed.length <= 10) {
          updateData.country_code = trimmed.substring(0, 10);
        } else {
          updateData.country_code = null; // Invalid, set to null
        }
      }
    }
    
    // Clean and validate area_code
    if (body.area_code !== undefined) {
      if (!body.area_code || body.area_code.trim() === '') {
        updateData.area_code = null;
      } else {
        const trimmed = body.area_code.trim();
        updateData.area_code = trimmed.length <= 10 ? trimmed : trimmed.substring(0, 10);
      }
    }
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.crm_id !== undefined) updateData.crm_id = body.crm_id;
    if (body.assigned_phone_number_id !== undefined) updateData.assigned_phone_number_id = body.assigned_phone_number_id;

    const contact = await hebesContacts.update(updateData, token);
    
    return NextResponse.json({ contact, success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact', details: error.message }, { status: 500 });
  }
}

// DELETE - Delete contact
export async function DELETE(req: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const id = params.contactId;
    await hebesContacts.delete(id, token);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact', details: error.message }, { status: 500 });
  }
}

