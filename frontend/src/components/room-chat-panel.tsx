import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Send, Circle } from 'lucide-react';

export interface RoomChatMessage {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
  /** true if this message was sent by the local user */
  isOwn: boolean;
}

interface RoomChatPanelProps {
  messages: RoomChatMessage[];
  onSend: (text: string) => void;
  username: string;
  onlineUsers: string[];
}

const RoomChatPanel = ({ messages, onSend, username, onlineUsers }: RoomChatPanelProps) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-onedark-background border-2 border-onedark-selection rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-onedark-selection bg-onedark-selection/40 flex-shrink-0">
        <Users size={14} className="text-onedark-green flex-shrink-0" />
        <span className="text-xs font-medium text-onedark-foreground truncate">{username}</span>
      </div>

      {/* Online users */}
      <div className="border-b border-onedark-selection bg-onedark-selection/10 px-2 py-1.5 flex-shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 flex-wrap">
          {onlineUsers.slice(0, 4).map((user, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] sm:text-xs whitespace-nowrap ${
                user === username
                  ? 'bg-onedark-cyan/20 text-onedark-cyan'
                  : 'bg-onedark-selection/60 text-onedark-foreground'
              }`}
            >
              <Circle size={6} className="text-onedark-green fill-onedark-green" />
              <span className="truncate max-w-[60px] sm:max-w-[80px]">{user === username ? 'You' : user.split(' ')[0]}</span>
            </div>
          ))}
          {onlineUsers.length > 4 && (
            <span className="text-[11px] text-onedark-comment">+{onlineUsers.length - 4}</span>
          )}
          {onlineUsers.length === 0 && (
            <span className="text-xs text-onedark-comment">No users online</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-onedark-comment">
            <div className="text-center p-2">
              <Users size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">No messages yet</p>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}
            >
              {/* Sender + time */}
              <div className="flex items-center gap-1 mb-0.5 px-0.5">
                <span
                  className={`text-[11px] sm:text-xs font-medium truncate max-w-[70px] sm:max-w-[100px] ${
                    msg.isOwn ? 'text-onedark-blue' : 'text-onedark-green'
                  }`}
                >
                  {msg.isOwn ? 'You' : msg.sender.split(' ')[0]}
                </span>
                <span className="text-[10px] sm:text-[11px] text-onedark-comment">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[95%] px-2.5 py-1.5 rounded-lg text-xs sm:text-sm leading-relaxed break-words whitespace-pre-wrap ${
                  msg.isOwn
                    ? 'bg-onedark-blue/80 text-white rounded-tr-sm'
                    : 'bg-onedark-selection text-onedark-foreground rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-onedark-comment/30 p-2 flex-shrink-0">
        <div className="flex gap-1.5 items-end">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
            placeholder="Message…"
            className="flex-1 min-w-0 bg-onedark-selection border border-onedark-comment/50 text-onedark-foreground placeholder:text-onedark-comment rounded px-2.5 py-1.5 text-xs sm:text-sm outline-none focus:border-onedark-blue transition-colors"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            size="sm"
            className="bg-onedark-green hover:bg-onedark-green/80 text-white flex-shrink-0 h-7 w-7 p-0"
          >
            <Send size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomChatPanel;
