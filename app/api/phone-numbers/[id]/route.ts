import { NextRequest, NextResponse } from 'next/server';
import { hebesPut, hebesDelete } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// PUT - Update customer phone number
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const id = params.id;
    const body = await req.json();

    const updateData: any = {
      id,
    };

    if (body.phone_number !== undefined) updateData.phone_number = body.phone_number;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.is_verified !== undefined) updateData.is_verified = body.is_verified;

    const phoneNumber = await hebesPut<any>('customer_phone_numbers.php', updateData, token);
    
    return NextResponse.json({ phoneNumber, success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating phone number:', error);
    return NextResponse.json({ error: 'Failed to update phone number', details: error.message }, { status: 500 });
  }
}

// DELETE - Delete customer phone number
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const id = params.id;
    await hebesDelete<any>('customer_phone_numbers.php', id, token);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting phone number:', error);
    return NextResponse.json({ error: 'Failed to delete phone number', details: error.message }, { status: 500 });
  }
}

