import { NextRequest, NextResponse } from 'next/server';
import { hebesSmsMessages } from '@/lib/hebes-api';
import { getTokenFromRequest } from '@/lib/api-helpers';

// DELETE - Delete all messages for a conversation (by phone number or conversation_id)
export async function DELETE(req: NextRequest, { params }: { params: { phoneNumber: string } }) {
  try {
    const token = getTokenFromRequest(req);
    const phoneNumberOrConversationId = decodeURIComponent(params.phoneNumber);


    // Get all messages
    const allMessages = await hebesSmsMessages.getAll(token);
    const messagesArray = Array.isArray(allMessages) ? allMessages : [];

    // Find messages to delete - either by conversation_id or by phone number
    const messagesToDelete = messagesArray.filter((msg: any) => {
      // If phoneNumberOrConversationId looks like a conversation_id (matches message's conversation_id)
      if (msg.conversation_id === phoneNumberOrConversationId) {
        return true;
      }
      
      // Otherwise, match by phone number (inbound: from_number, outbound: to_number)
      if (msg.direction === 'inbound' && msg.from_number === phoneNumberOrConversationId) {
        return true;
      }
      if (msg.direction === 'outbound' && msg.to_number === phoneNumberOrConversationId) {
        return true;
      }
      
      return false;
    });


    // Delete each message
    let deletedCount = 0;
    for (const message of messagesToDelete) {
      try {
        await hebesSmsMessages.delete(message.id, token);
        deletedCount++;
      } catch (error: any) {
        console.error(`Error deleting message ${message.id}:`, error);
        // Continue with other messages
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Conversation deleted successfully',
      deletedCount 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ 
      error: 'Failed to delete conversation', 
      details: error.message 
    }, { status: 500 });
  }
}

