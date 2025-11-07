import { NextRequest, NextResponse } from 'next/server';
import { hebesSenderAccounts, hebesSenderPhoneNumbers } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// PUT - Update sender account
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const id = params.id;
    const body = await req.json();

    // Build update data - include id for Hebes API
    const updateData: any = {
      id,
    };

    if (body.account_name !== undefined) updateData.account_name = body.account_name;
    if (body.account_sid !== undefined) updateData.account_sid = body.account_sid;
    if (body.auth_token !== undefined) updateData.auth_token = body.auth_token;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    
    // Handle webhook URLs in settings JSON field
    if (body.webhook_url !== undefined || body.pre_webhook_url !== undefined) {
      // Get existing account to preserve settings
      try {
        const existing = await hebesSenderAccounts.getById(id, token);
        const existingSettings = existing.settings || {};
        updateData.settings = {
          ...existingSettings,
          ...(body.webhook_url !== undefined && { webhook_url: body.webhook_url }),
          ...(body.pre_webhook_url !== undefined && { pre_webhook_url: body.pre_webhook_url }),
        };
      } catch {
        // If can't get existing, create new settings
        updateData.settings = {
          ...(body.webhook_url !== undefined && { webhook_url: body.webhook_url }),
          ...(body.pre_webhook_url !== undefined && { pre_webhook_url: body.pre_webhook_url }),
        };
      }
    }

    const account = await hebesSenderAccounts.update(updateData, token);
    
    return NextResponse.json({ account, success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating sender account:', error);
    return NextResponse.json({ error: 'Failed to update sender account', details: error.message }, { status: 500 });
  }
}

// DELETE - Delete sender account
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const id = params.id;

    // Delete all phone numbers associated with this account first
    try {
      const phoneNumbers = await hebesSenderPhoneNumbers.getByAccountId(id, token);
      if (Array.isArray(phoneNumbers)) {
        for (const phone of phoneNumbers) {
          try {
            await hebesSenderPhoneNumbers.delete(phone.id, token);
          } catch (phoneError) {
            console.error(`Error deleting phone number ${phone.id}:`, phoneError);
            // Continue with other phone numbers
          }
        }
      }
    } catch (phoneError) {
      console.error('Error fetching/deleting associated phone numbers:', phoneError);
      // Continue with account deletion even if phone deletion fails
    }

    // Delete the account
    await hebesSenderAccounts.delete(id, token);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting sender account:', error);
    return NextResponse.json({ error: 'Failed to delete sender account', details: error.message }, { status: 500 });
  }
}

