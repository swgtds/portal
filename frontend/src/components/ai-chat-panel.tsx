import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ChatMessageComponent, { ChatMessage } from '@/components/chat-message';

interface AIChatPanelProps {
  text: string;
  onInsertToEditor: (content: string) => void;
  onInsertCodeOnly: (content: string) => void;
}

const AIChatPanel = ({ text, onInsertToEditor, onInsertCodeOnly }: AIChatPanelProps) => {
  const { toast } = useToast();
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!aiPrompt.trim()) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      toast({
        title: 'API Key Missing',
        description: 'Please add your Gemini API key as VITE_GEMINI_API_KEY',
        variant: 'destructive',
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      type: 'user',
      content: aiPrompt,
      timestamp: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    const currentPrompt = aiPrompt;
    setAiPrompt('');
    setIsGenerating(true);

    try {
      const conversationHistory = chatMessages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      let contextualPrompt = currentPrompt;
      if (text.trim()) {
        contextualPrompt = `Context from editor:\n\`\`\`\n${text}\n\`\`\`\n\nUser question: ${currentPrompt}`;
      }

      conversationHistory.push({ role: 'user', parts: [{ text: contextualPrompt }] });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: conversationHistory }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';

      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'ai',
          content: generatedText,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Error',
        description: errorMessage || 'Failed to generate AI response.',
        variant: 'destructive',
      });
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'ai',
          content: `Error: ${errorMessage}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    toast({ title: 'Chat Cleared', description: 'All messages have been removed.' });
  };

  const handleInsertCodeSnippet = (code: string, language?: string) => {
    const newText = text + (text ? '\n\n' : '') + code;
    onInsertToEditor(newText);
    toast({
      title: 'Code Snippet Inserted',
      description: `Code snippet${language ? ` (${language})` : ''} added to the editor`,
    });
  };

  return (
    <div className="flex flex-col h-full bg-onedark-background border-2 border-onedark-selection rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-2 border-b border-onedark-selection bg-onedark-selection/40 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Bot size={16} className="text-onedark-purple" />
          <span className="text-xs sm:text-sm font-medium text-onedark-foreground">AI Chat</span>
        </div>
        {chatMessages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="h-6 px-2 text-[11px] text-onedark-red hover:bg-onedark-red/10 hover:text-onedark-red"
          >
            <Trash2 size={12} className="mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-2 space-y-2">
        {chatMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-onedark-comment">
            <div className="text-center py-4">
              <Bot size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs sm:text-sm px-2">Ask anything — I can see your editor context.</p>
            </div>
          </div>
        ) : (
          chatMessages.map(msg => (
            <ChatMessageComponent
              key={msg.id}
              message={msg}
              onInsertToEditor={onInsertToEditor}
              onInsertCodeOnly={onInsertCodeOnly}
              onInsertCodeSnippet={handleInsertCodeSnippet}
            />
          ))
        )}

        {isGenerating && (
          <div className="flex gap-2 p-2 bg-onedark-background border border-onedark-comment/30 rounded-lg">
            <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-onedark-purple">
              <Bot size={12} className="text-white" />
            </div>
            <div className="flex items-center gap-2 text-onedark-comment text-xs sm:text-sm">
              <div className="animate-spin h-3 w-3 border-2 border-onedark-blue border-t-transparent rounded-full" />
              Thinking…
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-onedark-comment/30 p-2 flex-shrink-0">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask something…"
            className="flex-1 min-w-0 bg-onedark-selection border border-onedark-comment/50 text-onedark-foreground placeholder:text-onedark-comment focus:ring-1 focus:ring-onedark-blue focus:border-transparent text-xs sm:text-sm rounded px-2.5 py-1.5"
            disabled={isGenerating}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!aiPrompt.trim() || isGenerating}
            size="sm"
            className="bg-onedark-blue hover:bg-onedark-blue/80 text-white h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0"
          >
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
