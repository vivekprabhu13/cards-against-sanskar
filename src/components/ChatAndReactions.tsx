import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, LiveReaction } from '../types/game';
import { DESI_REACTIONS } from '../data/defaultDecks';
import { MessageSquare, Send, X, ChevronUp, ChevronDown } from 'lucide-react';

interface ChatAndReactionsProps {
  chatMessages: ChatMessage[];
  floatingReactions: LiveReaction[];
  onSendChat: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  myPlayerId: string;
}

export const ChatAndReactions: React.FC<ChatAndReactionsProps> = ({
  chatMessages,
  floatingReactions,
  onSendChat,
  onSendReaction,
  myPlayerId
}) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(chatMessages.length);

  useEffect(() => {
    if (!chatOpen && chatMessages.length > prevMessagesLength.current) {
      setUnreadCount(prev => prev + (chatMessages.length - prevMessagesLength.current));
    }
    prevMessagesLength.current = chatMessages.length;

    if (chatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  const handleOpenChat = () => {
    setChatOpen(!chatOpen);
    if (!chatOpen) {
      setUnreadCount(0);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  const quickPhrases = [
    'Log kya kahenge?! 🤦‍♂️',
    'Aunty Ji is watching! 🥿',
    'Sharma ji ka beta did it better! 👔',
    'Pure comedy gold! 😂',
    'Spicy! 🌶️'
  ];

  return (
    <>
      {/* Floating Reactions on Screen */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map(r => (
          <div
            key={r.id}
            style={{ left: `${r.x || 50}%` }}
            className="absolute bottom-16 -translate-x-1/2 flex flex-col items-center animate-reaction-float"
          >
            <span className="text-4xl filter drop-shadow-md select-none">
              {r.emoji}
            </span>
            <span className="text-[10px] font-bold text-amber-200 bg-stone-900/80 px-2 py-0.5 rounded-full border border-stone-700/80 mt-1 shadow-sm whitespace-nowrap">
              {r.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Floating Reaction Bar & Chat Trigger at Bottom */}
      <aside aria-label="Reactions and Chat" className="fixed bottom-3 right-3 sm:right-6 z-40 flex items-center gap-2">
        {/* Desi Reaction Emoji Pills */}
        <div className="hidden sm:flex items-center gap-1 p-1 bg-stone-900/90 backdrop-blur-md border border-stone-800 rounded-full shadow-xl">
          {DESI_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              className="w-8 h-8 rounded-full hover:bg-stone-800 flex items-center justify-center text-lg transition-transform active:scale-125 hover:scale-110"
              title={`Send reaction: ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Mobile Reactions dropdown / trigger */}
        <div className="sm:hidden flex items-center gap-1 p-1 bg-stone-900/90 border border-stone-800 rounded-full shadow-lg">
          {['🥿', '😂', '☕', '🌶️'].map(emoji => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-base active:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Chat Toggle Button */}
        <button
          onClick={handleOpenChat}
          className="relative p-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-xl transition-all active:scale-95 flex items-center justify-center"
          title="Open Room Chat"
        >
          <MessageSquare className="w-5 h-5 fill-current" />
          {unreadCount > 0 && !chatOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-stone-900">
              {unreadCount}
            </span>
          )}
        </button>
      </aside>

      {/* Chat Drawer */}
      {chatOpen && (
        <div className="fixed bottom-16 right-3 sm:right-6 z-40 w-[90vw] sm:w-80 h-96 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-3 border-b border-stone-800 bg-stone-950/60">
            <div className="flex items-center gap-2">
              <span className="text-base">💬</span>
              <span className="text-xs font-bold text-stone-100">
                Khandaan Gossip & Announcements
              </span>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Phrases */}
          <div className="flex items-center gap-1.5 p-2 border-b border-stone-800/80 overflow-x-auto bg-stone-950/30 scrollbar-none text-[10px]">
            {quickPhrases.map(phrase => (
              <button
                key={phrase}
                onClick={() => onSendChat(phrase)}
                className="whitespace-nowrap px-2 py-0.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700/60 transition-colors"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {chatMessages.length === 0 ? (
              <div className="text-center text-stone-500 py-8 text-[11px]">
                No gossip yet. Send a message to start the drama!
              </div>
            ) : (
              chatMessages.map(msg => {
                if (msg.isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="py-1 px-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-amber-200/90 text-[11px] italic"
                    >
                      {msg.text}
                    </div>
                  );
                }

                const isMe = msg.senderId === myPlayerId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-stone-400 px-1 font-semibold">
                      {isMe ? 'You' : msg.senderName}
                    </span>
                    <div
                      className={`p-2 rounded-xl max-w-[85%] break-words ${
                        isMe
                          ? 'bg-amber-600 text-white rounded-br-none'
                          : 'bg-stone-800 text-stone-200 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-2 border-t border-stone-800 bg-stone-950/80 flex items-center gap-1.5"
          >
            <input
              type="text"
              placeholder="Type your spicy comeback..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 disabled:opacity-40 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
