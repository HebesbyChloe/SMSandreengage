import { Plus, MessageCircle, Trash2, RefreshCw } from 'lucide-react';
import { Conversation } from '../../types';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewMessage: () => void;
  onDeleteConversation?: (phoneNumber: string) => void;
  onRefresh?: () => void;
}

export function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  onNewMessage,
  onDeleteConversation,
  onRefresh,
}: ConversationListProps) {
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const truncateMessage = (text: string | null | undefined, maxLength: number = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-gray-900">Messages</h2>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Refresh conversations"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onNewMessage}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
            aria-label="New message"
            title="New message"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
            <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 mb-3" />
            <p className="text-center text-sm sm:text-base">No conversations yet</p>
            <p className="text-center text-sm sm:text-base">Start a new message to begin</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.conversationId || conversation.phoneNumber}
              className={`group relative w-full flex items-start gap-2 sm:gap-3 border-b border-gray-100 ${
                selectedConversation?.conversationId === conversation.conversationId
                  ? 'bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <button
                onClick={() => onSelectConversation(conversation)}
                className="flex-1 p-3 sm:p-4 flex items-start gap-2 sm:gap-3 active:bg-gray-100 transition-colors text-left"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-900 truncate text-sm sm:text-base">
                        {conversation.contact?.name || formatPhoneNumber(conversation.phoneNumber)}
                      </h3>
                      {conversation.contact?.name && (
                        <p className="text-gray-500 text-xs sm:text-sm">
                          {formatPhoneNumber(conversation.phoneNumber)}
                        </p>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <span className="text-gray-500 flex-shrink-0 ml-2 text-xs">
                        {formatTime(conversation.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage && (
                    <p className="text-gray-600 truncate text-sm">
                      {conversation.lastMessage.direction === 'outbound' && 'You: '}
                      {truncateMessage(conversation.lastMessage.body)}
                    </p>
                  )}
                </div>
              </button>
              {onDeleteConversation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete conversation with ${conversation.contact?.name || formatPhoneNumber(conversation.phoneNumber)}? This will permanently delete all messages.`)) {
                      onDeleteConversation(conversation.phoneNumber);
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
