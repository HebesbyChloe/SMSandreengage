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

    // Get the existing record first to ensure we have all required fields
    let existingRecord;
    try {
      existingRecord = await hebesSenderPhoneNumbers.getById(id, token);
    } catch (err) {
      console.error('❌ Cannot get existing record:', id);
      return NextResponse.json({ 
        error: 'Phone number not found', 
        details: `Cannot update: phone number with id ${id} does not exist`
      }, { status: 404 });
    }

    // Build update data: merge existing record with new values
    // This ensures all required fields are present
    const updateData: any = {
      id,
      // Keep existing values
      phone_number: existingRecord.phone_number,
      friendly_name: existingRecord.friendly_name,
      account_id: existingRecord.account_id,
      is_primary: existingRecord.is_primary,
      is_active: existingRecord.is_active,
      // Override with new values if provided
    };

    if (body.phone_number !== undefined) updateData.phone_number = body.phone_number;
    if (body.friendly_name !== undefined) updateData.friendly_name = body.friendly_name;
    // Convert boolean to numeric (1/0) for Hebes API compatibility
    if (body.is_primary !== undefined) updateData.is_primary = body.is_primary ? 1 : 0;
    if (body.is_active !== undefined) updateData.is_active = body.is_active ? 1 : 0;
    if (body.account_id !== undefined) updateData.account_id = body.account_id;
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to;

    console.log('📝 Updating sender phone number:', { 
      id, 
      updateData, 
      method: 'PUT',
      existingRecord: { 
        phone_number: existingRecord.phone_number,
        is_active: existingRecord.is_active,
        is_primary: existingRecord.is_primary 
      }
    });
    
    // Store a copy for potential restore
    const recordBeforeUpdate = { ...existingRecord };
    
    // Perform the update
    const phoneNumber = await hebesSenderPhoneNumbers.update(updateData, token);
    console.log('✅ Update API call successful, response:', phoneNumber);
    
    // Verify the record still exists after update
    let recordAfterUpdate;
    try {
      recordAfterUpdate = await hebesSenderPhoneNumbers.getById(id, token);
      console.log('✅ Record still exists after update:', { id, phone_number: recordAfterUpdate?.phone_number, is_active: recordAfterUpdate?.is_active, is_primary: recordAfterUpdate?.is_primary });
    } catch (err) {
      console.error('❌ CRITICAL: Record was DELETED during update!', { id, error: err });
      
      // Try to restore the record by creating it again with updated values
      try {
        console.log('🔄 Attempting to restore deleted record...');
        const restoreData = {
          ...existingRecord,
          ...updateData,
          // Remove id so it creates a new record (or use the same id if Hebes API supports it)
          account_id: existingRecord.account_id || updateData.account_id,
        };
        
        // Try to create with the same data
        const restored = await hebesSenderPhoneNumbers.create(restoreData, token);
        console.log('✅ Record restored:', restored);
        
        return NextResponse.json({ 
          error: 'Record was deleted during update but has been restored', 
          details: `The phone number was deleted instead of updated (Hebes API bug), but we restored it.`,
          phoneNumber: restored,
          warning: 'This indicates a bug in the Hebes API update endpoint',
          success: true
        }, { status: 200 });
      } catch (restoreErr: any) {
        console.error('❌ Failed to restore record:', restoreErr);
        return NextResponse.json({ 
          error: 'Record was deleted during update and could not be restored', 
          details: `The phone number with id ${id} was deleted instead of updated. This is a bug in the Hebes API. Attempted restore failed: ${restoreErr.message}`,
          recordBeforeUpdate: existingRecord,
          updateData: updateData,
          restoreError: restoreErr.message
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ phoneNumber: recordAfterUpdate, success: true }, { status: 200 });
  } catch (error: any) {
    // Extract detailed error information
    const errorMessage = error?.message || 'Unknown error';
    const errorDetails = error?.details || errorMessage;
    const hebesError = error?.data || error?.response?.data || errorMessage;
    
    console.error('❌ Error updating sender phone number:', {
      id,
      updateData,
      requestBody: body,
      errorMessage: errorMessage,
      errorDetails: errorDetails,
      hebesError: hebesError,
      errorStack: error?.stack,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
    });
    
    return NextResponse.json({ 
      error: 'Failed to update sender phone number', 
      details: errorDetails,
      hebesApiError: typeof hebesError === 'string' ? hebesError : JSON.stringify(hebesError),
      requestData: updateData,
      statusCode: 500
    }, { status: 500 });
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

