import { NextRequest, NextResponse } from 'next/server';
import { hebesSenderPhoneNumbers, hebesSenderAccounts } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// GET - Get sender phone number by ID (with account info)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const id = params.id;
    const phoneNumber = await hebesSenderPhoneNumbers.getById(id, token);
    
    // Get associated account if account_id exists
    if (phoneNumber.account_id) {
      try {
        const account = await hebesSenderAccounts.getById(phoneNumber.account_id, token);
        phoneNumber.sender_accounts = account;
      } catch (error) {
        console.warn('Could not fetch associated account:', error);
      }
    }
    
    return NextResponse.json(phoneNumber, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching sender phone number:', error);
    return NextResponse.json({ error: 'Phone number not found', details: error.message }, { status: 404 });
  }
}

// PUT - Update sender phone number
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const id = params.id;
    const body = await req.json();

    const updateData: any = {
      id,
    };

    if (body.phone_number !== undefined) updateData.phone_number = body.phone_number;
    if (body.friendly_name !== undefined) updateData.friendly_name = body.friendly_name;
    if (body.is_primary !== undefined) updateData.is_primary = body.is_primary;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.account_id !== undefined) updateData.account_id = body.account_id;
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to;

    const phoneNumber = await hebesSenderPhoneNumbers.update(updateData, token);
    
    return NextResponse.json({ phoneNumber, success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating sender phone number:', error);
    return NextResponse.json({ error: 'Failed to update sender phone number', details: error.message }, { status: 500 });
  }
}

// DELETE - Delete sender phone number
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const id = params.id;
    await hebesSenderPhoneNumbers.delete(id, token);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting sender phone number:', error);
    return NextResponse.json({ error: 'Failed to delete sender phone number', details: error.message }, { status: 500 });
  }
}

