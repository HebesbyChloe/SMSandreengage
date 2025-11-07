'use client';

import { useState } from 'react';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😊', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '🥱', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑'],
  'Gestures': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'Objects': ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🎮', '🎯', '🎲', '🎰', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🎺', '🎷', '🎸'],
};

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys');

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Add emoji"
      >
        <Smile className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Emoji Picker Popup */}
          <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-80">
            {/* Category Tabs */}
            <div className="flex border-b border-gray-200 p-2 gap-1">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
                  className={`px-3 py-1 rounded transition-colors ${
                    activeCategory === category
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Emoji Grid */}
            <div className="p-3 grid grid-cols-8 gap-1 max-h-64 overflow-y-auto">
              {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-2xl p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
