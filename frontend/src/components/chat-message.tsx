import { Button } from '@/components/ui/button';
import MarkdownRenderer from '@/components/markdown-renderer';
import { User, Bot, Plus } from 'lucide-react';

export interface ChatMessage {
  id: number;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface ChatMessageProps {
  message: ChatMessage;
  onInsertToEditor: (content: string) => void;
  onInsertCodeOnly: (content: string) => void;
  onInsertCodeSnippet: (code: string, language?: string) => void;
}

const ChatMessageComponent = ({ message, onInsertToEditor, onInsertCodeOnly, onInsertCodeSnippet }: ChatMessageProps) => {
  const hasCodeBlocks = message.content.includes('```');

  return (
    <div className={`flex gap-3 p-4 ${message.type === 'user' ? 'bg-onedark-selection/30' : 'bg-onedark-background'} border border-onedark-comment/30 rounded-lg`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.type === 'user' ? 'bg-onedark-blue' : 'bg-onedark-purple'}`}>
        {message.type === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-onedark-foreground">
            {message.type === 'user' ? 'You' : 'AI Assistant'}
          </span>
          <span className="text-xs text-onedark-comment">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        
        <div className="text-onedark-foreground">
          {message.type === 'ai' ? (
            <MarkdownRenderer 
              content={message.content}
              onInsertCodeSnippet={onInsertCodeSnippet}
            />
          ) : (
            <div className="whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          )}
        </div>
        
        {message.type === 'ai' && (
          <div className="flex flex-wrap gap-2 mt-3">
            {hasCodeBlocks && (
              <Button
                size="sm"
                onClick={() => onInsertCodeOnly(message.content)}
                className="bg-onedark-blue hover:bg-onedark-blue/80 text-white"
              >
                <Plus size={14} className="mr-1" />
                Insert Code Only
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => onInsertToEditor(message.content)}
              className="bg-onedark-green hover:bg-onedark-green/80 text-white"
            >
              <Plus size={14} className="mr-1" />
              Insert Full Text
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageComponent;