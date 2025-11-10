import { NextRequest, NextResponse } from 'next/server';
import { createTwilioClient } from '@/lib/twilio/client';

// POST - Handle test requests for Twilio API endpoints
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, ...params } = body;

    if (!params.accountSid || !params.authToken) {
      return NextResponse.json(
        { error: 'Account SID and Auth Token are required' },
        { status: 400 }
      );
    }

    const twilioClient = createTwilioClient({
      accountSid: params.accountSid,
      authToken: params.authToken,
    });

    let result: any;

    switch (endpoint) {
      case 'create-conversation': {
        const conversationParams: any = {};
        if (params.friendlyName) conversationParams.friendlyName = params.friendlyName;
        
        if (params.conversationServiceSid) {
          result = await twilioClient.conversations.v1
            .services(params.conversationServiceSid)
            .conversations
            .create(conversationParams);
        } else {
          result = await twilioClient.conversations.v1.conversations.create(conversationParams);
        }
        break;
      }

      case 'list-conversations': {
        const listParams: any = {};
        if (params.limit) listParams.limit = parseInt(params.limit);
        
        // If conversationServiceSid is provided, list conversations from that service
        if (params.conversationServiceSid) {
          result = await twilioClient.conversations.v1
            .services(params.conversationServiceSid)
            .conversations
            .list(listParams);
        } else {
          result = await twilioClient.conversations.v1.conversations.list(listParams);
        }
        break;
      }

      case 'find-conversation-by-phone': {
        if (!params.phoneNumber) {
          return NextResponse.json(
            { error: 'Phone number is required' },
            { status: 400 }
          );
        }
        
        const phoneNumber = params.phoneNumber;
        const limit = params.limit ? parseInt(params.limit) : 1000; // Increased default limit
        
        // List conversations (from service if provided, otherwise all)
        let conversations: any[];
        if (params.conversationServiceSid) {
          conversations = await twilioClient.conversations.v1
            .services(params.conversationServiceSid)
            .conversations
            .list({ limit });
        } else {
          conversations = await twilioClient.conversations.v1.conversations.list({ limit });
        }
        
        
        // Search through conversations to find ones with matching participant
        const matchingConversations: any[] = [];
        
        // Helper function to get participants (using service-specific endpoint if needed)
        const getParticipants = async (conversationSid: string) => {
          if (params.conversationServiceSid) {
            return await twilioClient.conversations.v1
              .services(params.conversationServiceSid)
              .conversations(conversationSid)
              .participants
              .list();
          } else {
            return await twilioClient.conversations.v1
              .conversations(conversationSid)
              .participants
              .list();
          }
        };
        
        for (const conversation of conversations) {
          try {
            const participants = await getParticipants(conversation.sid);
            
            // Check if phone number matches any participant's address
            // Also normalize phone numbers for comparison (remove spaces, dashes, etc.)
            const normalizePhone = (phone: string) => phone?.replace(/[\s\-\(\)]/g, '') || '';
            const normalizedSearchPhone = normalizePhone(phoneNumber);
            
            const hasMatch = participants.some((p: any) => {
              const participantAddress = p.messagingBinding?.address;
              if (!participantAddress) return false;
              
              // Try exact match first
              if (participantAddress === phoneNumber) return true;
              
              // Try normalized match
              const normalizedParticipantPhone = normalizePhone(participantAddress);
              if (normalizedParticipantPhone === normalizedSearchPhone) return true;
              
              // Try with/without + prefix
              const withPlus = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
              const withoutPlus = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : phoneNumber;
              
              if (participantAddress === withPlus || participantAddress === withoutPlus) return true;
              
              return false;
            });
            
            if (hasMatch) {
              matchingConversations.push({
                conversationSid: conversation.sid,
                friendlyName: conversation.friendlyName,
                dateCreated: conversation.dateCreated,
                dateUpdated: conversation.dateUpdated,
                state: conversation.state,
                participants: participants.map((p: any) => ({
                  sid: p.sid,
                  address: p.messagingBinding?.address,
                  proxyAddress: p.messagingBinding?.proxyAddress,
                  identity: p.identity,
                })),
              });
            }
          } catch (err: any) {
            // Skip conversations where we can't fetch participants
            console.warn(`Could not fetch participants for conversation ${conversation.sid}:`, err.message);
          }
        }
        
        result = {
          phoneNumber,
          found: matchingConversations.length,
          conversations: matchingConversations,
          searchedConversations: conversations.length,
        };
        break;
      }

      case 'get-conversation': {
        if (!params.conversationSid) {
          return NextResponse.json(
            { error: 'Conversation SID is required' },
            { status: 400 }
          );
        }
        // Use service-specific endpoint if conversationServiceSid is provided
        if (params.conversationServiceSid) {
          result = await twilioClient.conversations.v1
            .services(params.conversationServiceSid)
            .conversations(params.conversationSid)
            .fetch();
        } else {
          result = await twilioClient.conversations.v1
            .conversations(params.conversationSid)
            .fetch();
        }
        break;
      }

      case 'add-participant': {
        if (!params.conversationSid || !params.address) {
          return NextResponse.json(
            { error: 'Conversation SID and address are required' },
            { status: 400 }
          );
        }
        
        // Helper function to get participants list
        const getParticipants = async () => {
          if (params.conversationServiceSid) {
            return await twilioClient.conversations.v1
              .services(params.conversationServiceSid)
              .conversations(params.conversationSid)
              .participants
              .list();
          } else {
            return await twilioClient.conversations.v1
              .conversations(params.conversationSid)
              .participants
              .list();
          }
        };
        
        // Check if participant already exists in this conversation
        try {
          const existingParticipants = await getParticipants();
          const participantExists = existingParticipants.some((p: any) => {
            const addressMatch = p.messagingBinding?.address === params.address;
            const proxyMatch = params.proxyAddress 
              ? p.messagingBinding?.proxyAddress === params.proxyAddress
              : true; // If no proxyAddress specified, just check address
            return addressMatch && proxyMatch;
          });
          
          if (participantExists) {
            return NextResponse.json({
              success: true,
              message: 'Participant already exists in this conversation',
              conversationSid: params.conversationSid,
              address: params.address,
              proxyAddress: params.proxyAddress,
              existingParticipants: existingParticipants.map((p: any) => ({
                sid: p.sid,
                address: p.messagingBinding?.address,
                proxyAddress: p.messagingBinding?.proxyAddress,
              })),
            });
          }
        } catch (checkError: any) {
          // If we can't check, continue and try to add anyway
          console.warn('Could not check existing participants:', checkError.message);
        }
        
        const participantParams: any = {
          'messagingBinding.address': params.address,
        };
        if (params.proxyAddress) {
          participantParams['messagingBinding.proxyAddress'] = params.proxyAddress;
        }
        
        // Use service-specific endpoint if conversationServiceSid is provided
        try {
          if (params.conversationServiceSid) {
            result = await twilioClient.conversations.v1
              .services(params.conversationServiceSid)
              .conversations(params.conversationSid)
              .participants
              .create(participantParams);
          } else {
            result = await twilioClient.conversations.v1
              .conversations(params.conversationSid)
              .participants
              .create(participantParams);
          }
        } catch (error: any) {
          // Check for the specific error about existing binding in another conversation
          if (error.message && error.message.includes('already exists in Conversation')) {
            // Extract the conversation SID from the error message
            const match = error.message.match(/Conversation\s+([A-Za-z0-9]+)/);
            const existingConversationSid = match ? match[1] : 'unknown';
            
            return NextResponse.json({
              success: false,
              error: 'Participant binding conflict',
              details: error.message,
              troubleshooting: {
                issue: `The participant ${params.address} with proxy ${params.proxyAddress || 'N/A'} already exists in another conversation (${existingConversationSid}).`,
                explanation: 'Twilio does not allow the same participant + proxy address combination to exist in multiple conversations.',
                solutions: [
                  `1. Remove the participant from conversation ${existingConversationSid} first, then add to this conversation.`,
                  '2. Use a different proxy address for this conversation.',
                  '3. Delete the other conversation if it\'s no longer needed.',
                ],
                targetConversation: params.conversationSid,
                conflictingConversation: existingConversationSid,
                participantAddress: params.address,
                proxyAddress: params.proxyAddress,
              },
            }, { status: 409 }); // 409 Conflict
          }
          // Re-throw other errors
          throw error;
        }
        break;
      }

      case 'list-participants': {
        if (!params.conversationSid) {
          return NextResponse.json(
            { error: 'Conversation SID is required' },
            { status: 400 }
          );
        }
        // Use service-specific endpoint if conversationServiceSid is provided
        if (params.conversationServiceSid) {
          result = await twilioClient.conversations.v1
            .services(params.conversationServiceSid)
            .conversations(params.conversationSid)
            .participants
            .list();
        } else {
          result = await twilioClient.conversations.v1
            .conversations(params.conversationSid)
            .participants
            .list();
        }
        break;
      }

      case 'send-message': {
        if (!params.conversationSid || !params.body) {
          return NextResponse.json(
            { error: 'Conversation SID and message body are required' },
            { status: 400 }
          );
        }
        const messageParams: any = {
          body: params.body,
        };
        if (params.author) {
          messageParams.author = params.author;
        }
        // Use service-specific endpoint if conversationServiceSid is provided
        if (params.conversationServiceSid) {
          result = await twilioClient.conversations.v1
            .services(params.conversationServiceSid)
            .conversations(params.conversationSid)
            .messages
            .create(messageParams);
        } else {
          result = await twilioClient.conversations.v1
            .conversations(params.conversationSid)
            .messages
            .create(messageParams);
        }
        break;
      }

      case 'list-messages': {
        if (!params.conversationSid) {
          return NextResponse.json(
            { error: 'Conversation SID is required' },
            { status: 400 }
          );
        }
        const listParams: any = {};
        if (params.limit) listParams.limit = parseInt(params.limit);
        // Use service-specific endpoint if conversationServiceSid is provided
        if (params.conversationServiceSid) {
          result = await twilioClient.conversations.v1
            .services(params.conversationServiceSid)
            .conversations(params.conversationSid)
            .messages
            .list(listParams);
        } else {
          result = await twilioClient.conversations.v1
            .conversations(params.conversationSid)
            .messages
            .list(listParams);
        }
        break;
      }

      case 'list-services': {
        result = await twilioClient.conversations.v1.services.list();
        break;
      }

      case 'remove-participant': {
        if (!params.conversationSid || !params.participantSid) {
          return NextResponse.json(
            { error: 'Conversation SID and Participant SID are required' },
            { status: 400 }
          );
        }
        // Use service-specific endpoint if conversationServiceSid is provided
        if (params.conversationServiceSid) {
          result = await twilioClient.conversations.v1
            .services(params.conversationServiceSid)
            .conversations(params.conversationSid)
            .participants(params.participantSid)
            .remove();
        } else {
          result = await twilioClient.conversations.v1
            .conversations(params.conversationSid)
            .participants(params.participantSid)
            .remove();
        }
        break;
      }

      case 'delete-message': {
        if (!params.conversationSid || !params.messageSid) {
          return NextResponse.json(
            { error: 'Conversation SID and Message SID are required' },
            { status: 400 }
          );
        }
        // Use service-specific endpoint if conversationServiceSid is provided
        if (params.conversationServiceSid) {
          result = await twilioClient.conversations.v1
            .services(params.conversationServiceSid)
            .conversations(params.conversationSid)
            .messages(params.messageSid)
            .remove();
        } else {
          result = await twilioClient.conversations.v1
            .conversations(params.conversationSid)
            .messages(params.messageSid)
            .remove();
        }
        break;
      }

      case 'delete-conversation': {
        if (!params.conversationSid) {
          return NextResponse.json(
            { error: 'Conversation SID is required' },
            { status: 400 }
          );
        }
        
        // Support multiple conversation SIDs separated by comma
        const conversationSids = params.conversationSid
          .split(',')
          .map((sid: string) => sid.trim())
          .filter((sid: string) => sid.length > 0);
        
        if (conversationSids.length === 0) {
          return NextResponse.json(
            { error: 'At least one valid Conversation SID is required' },
            { status: 400 }
          );
        }
        
        // If single conversation, delete it directly
        if (conversationSids.length === 1) {
          if (params.conversationServiceSid) {
            result = await twilioClient.conversations.v1
              .services(params.conversationServiceSid)
              .conversations(conversationSids[0])
              .remove();
          } else {
            result = await twilioClient.conversations.v1
              .conversations(conversationSids[0])
              .remove();
          }
        } else {
          // Multiple conversations - delete each one
          const results: any[] = [];
          const errors: any[] = [];
          
          for (const sid of conversationSids) {
            try {
              let deleteResult;
              if (params.conversationServiceSid) {
                deleteResult = await twilioClient.conversations.v1
                  .services(params.conversationServiceSid)
                  .conversations(sid)
                  .remove();
              } else {
                deleteResult = await twilioClient.conversations.v1
                  .conversations(sid)
                  .remove();
              }
              results.push({
                conversationSid: sid,
                success: true,
                result: deleteResult,
              });
            } catch (error: any) {
              errors.push({
                conversationSid: sid,
                success: false,
                error: error.message,
                code: error.code,
                status: error.status,
              });
            }
          }
          
          result = {
            total: conversationSids.length,
            successful: results.length,
            failed: errors.length,
            results: results,
            errors: errors,
          };
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown endpoint: ${endpoint}` },
          { status: 400 }
        );
    }

    // Helper function to extract plain data from Twilio objects (handles circular references)
    const extractTwilioData = (obj: any, visited: WeakSet<any> = new WeakSet()): any => {
      if (obj === null || obj === undefined) {
        return obj;
      }
      
      // Handle arrays (like list results)
      if (Array.isArray(obj)) {
        return obj.map(item => extractTwilioData(item, visited));
      }
      
      // Handle objects
      if (obj && typeof obj === 'object') {
        // Check for circular reference
        if (visited.has(obj)) {
          return '[Circular Reference]';
        }
        
        // Mark as visited
        visited.add(obj);
        
        // Check if it's a Twilio resource (has _solution, _version, or _proxy)
        const isTwilioResource = obj._solution !== undefined || obj._version !== undefined || obj._proxy !== undefined;
        
        const plainData: any = {};
        
        // For Twilio resources, extract known properties
        if (isTwilioResource) {
          // Common Twilio resource properties
          const knownProps = [
            'sid', 'accountSid', 'friendlyName', 'dateCreated', 'dateUpdated',
            'url', 'links', 'uniqueName', 'attributes', 'state', 'timers',
            'messagingServiceSid', 'chatServiceSid', 'conversationServiceSid',
            'address', 'proxyAddress', 'identity', 'roleSid', 'lastReadMessageIndex',
            'lastReadTimestamp', 'body', 'author', 'index', 'delivery', 'participantSid',
            'conversationSid', 'messageSid', 'participantSid', 'serviceSid'
          ];
          
          // Extract known properties
          for (const prop of knownProps) {
            if (prop in obj && typeof obj[prop] !== 'function') {
              try {
                plainData[prop] = extractTwilioData(obj[prop], visited);
              } catch (e) {
                // Skip if error
              }
            }
          }
          
          // Also try to get all enumerable properties that aren't internal
          for (const key in obj) {
            if (key.startsWith('_') || typeof obj[key] === 'function') {
              continue; // Skip internal properties and methods
            }
            if (!(key in plainData)) {
              try {
                const value = obj[key];
                if (value !== null && typeof value === 'object') {
                  // Skip if it's a Twilio resource (circular reference)
                  if (value._proxy || value._version || value._solution) {
                    continue;
                  }
                }
                plainData[key] = extractTwilioData(value, visited);
              } catch (e) {
                // Skip if error
              }
            }
          }
        } else {
          // Handle plain objects
          for (const key in obj) {
            if (typeof obj[key] === 'function') {
              continue; // Skip methods
            }
            try {
              plainData[key] = extractTwilioData(obj[key], visited);
            } catch (e) {
              // Skip if error
            }
          }
        }
        
        return plainData;
      }
      
      // Return primitives as-is
      return obj;
    };

    // Extract plain data from Twilio response
    const jsonResult = extractTwilioData(result);

    return NextResponse.json({
      success: true,
      endpoint,
      data: jsonResult,
    });
  } catch (error: any) {
    console.error('Twilio API test error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo,
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

