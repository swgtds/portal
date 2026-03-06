import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Send } from 'lucide-react';

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
}

const RoomChatPanel = ({ messages, onSend, username }: RoomChatPanelProps) => {
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
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-onedark-selection bg-onedark-selection/40 flex-shrink-0">
        <Users size={15} className="text-onedark-green" />
        <span className="text-sm font-medium text-onedark-foreground">Room Chat</span>
        <span className="ml-auto text-xs text-onedark-comment truncate max-w-[120px]">
          You: <span className="text-onedark-cyan font-mono">{username}</span>
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-onedark-comment">
            <div className="text-center py-8">
              <Users size={36} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No messages yet.</p>
              <p className="text-xs mt-1 opacity-70">Say hi to your room!</p>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}
            >
              {/* Sender + time */}
              <div className="flex items-center gap-1.5 mb-0.5 px-1">
                <span
                  className={`text-xs font-medium ${
                    msg.isOwn ? 'text-onedark-blue' : 'text-onedark-green'
                  }`}
                >
                  {msg.isOwn ? 'You' : msg.sender}
                </span>
                <span className="text-[10px] text-onedark-comment">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap ${
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
      <div className="border-t border-onedark-comment/30 p-3 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={2}
            className="flex-1 bg-onedark-selection border border-onedark-comment/50 text-onedark-foreground placeholder:text-onedark-comment rounded-md px-3 py-2 text-sm resize-none outline-none focus:border-onedark-blue transition-colors leading-relaxed"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-onedark-green hover:bg-onedark-green/80 text-white self-end flex-shrink-0"
          >
            <Send size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomChatPanel;
