import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Bot, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ChatMessageComponent, { ChatMessage } from '@/components/chat-message';

interface AIChatDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  text: string;
  onInsertToEditor: (content: string) => void;
  onInsertCodeOnly: (content: string) => void;
}

const AIChatDialog = ({ 
  isOpen, 
  onOpenChange, 
  text, 
  onInsertToEditor, 
  onInsertCodeOnly 
}: AIChatDialogProps) => {
  const { toast } = useToast();
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
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
        title: "API Key Missing",
        description: "Please add your Gemini API key to the environment variables as VITE_GEMINI_API_KEY",
        variant: "destructive",
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      type: 'user',
      content: aiPrompt,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const currentPrompt = aiPrompt;
    setAiPrompt('');
    setIsGenerating(true);

    try {
      // Build conversation history
      const conversationHistory = chatMessages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      // Add context from the editor if available
      let contextualPrompt = currentPrompt;
      if (text.trim()) {
        contextualPrompt = `Context from editor:\n\`\`\`\n${text}\n\`\`\`\n\nUser question: ${currentPrompt}`;
      }

      conversationHistory.push({
        role: 'user',
        parts: [{ text: contextualPrompt }]
      });

      // Call Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: conversationHistory
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';

      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: generatedText,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Gemini API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Error",
        description: errorMessage || "Failed to generate AI response. Please check your API key and try again.",
        variant: "destructive",
      });

      const errorChatMessage: ChatMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: `Error: ${errorMessage || "Failed to generate response"}`,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    toast({
      title: "Chat Cleared",
      description: "All chat messages have been removed",
    });
  };

  const handleInsertCodeSnippet = (code: string, language?: string) => {
    const newText = text + (text ? '\n\n' : '') + code;
    onInsertToEditor(newText);
    
    toast({
      title: "Code Snippet Inserted",
      description: `Code snippet${language ? ` (${language})` : ''} added to the editor`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button className="group relative overflow-hidden rounded-md px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-onedark-blue via-onedark-purple to-onedark-cyan bg-size-200 animate-gradient-shift hover:animate-pulse-glow transition-all duration-300 transform hover:scale-105 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shine opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative flex items-center text-xs sm:text-sm font-medium text-white">
            <Sparkles className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">AI Chat</span>
            <span className="xs:hidden">AI</span>
          </div>
        </button>
      </DialogTrigger>
      
      <DialogContent className="bg-onedark-background border-onedark-selection max-w-5xl mx-4 sm:mx-auto max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b border-onedark-comment/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <DialogTitle className="text-onedark-foreground">
                  AI Assistant Chat
                </DialogTitle>
                <DialogDescription className="text-onedark-comment">
                  Ask questions, get help with coding, or brainstorm ideas
                </DialogDescription>
              </div>
              {chatMessages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  className="bg-transparent border-onedark-red/50 text-onedark-red hover:bg-onedark-red/10 flex-shrink-0"
                >
                  <Trash2 size={14} className="mr-1" />
                  Clear Chat
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col h-[75vh]">
          {/* Chat Messages Area */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            {chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-onedark-comment">
                <div className="text-center">
                  <Bot size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Start a conversation with the AI assistant</p>
                </div>
              </div>
            ) : (
              chatMessages.map((message) => (
                <ChatMessageComponent
                  key={message.id}
                  message={message}
                  onInsertToEditor={onInsertToEditor}
                  onInsertCodeOnly={onInsertCodeOnly}
                  onInsertCodeSnippet={handleInsertCodeSnippet}
                />
              ))
            )}
            
            {/* Loading indicator */}
            {isGenerating && (
              <div className="flex gap-3 p-4 bg-onedark-background border border-onedark-comment/30 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-onedark-purple">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-onedark-foreground">AI Assistant</span>
                  </div>
                  <div className="text-onedark-comment">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-onedark-blue border-t-transparent rounded-full"></div>
                      Thinking...
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Input Area */}
          <div className="border-t border-onedark-comment p-4">
            <div className="flex gap-3">
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={handlePromptKeyDown}
                placeholder="Type your message... (Shift+Enter for new line, Enter to send)"
                className="bg-onedark-selection border-onedark-comment text-onedark-foreground placeholder:text-onedark-comment focus:ring-onedark-blue focus:border-transparent min-h-[80px] resize-none text-sm"
                disabled={isGenerating}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!aiPrompt.trim() || isGenerating}
                className="bg-onedark-blue hover:bg-onedark-blue/80 text-white self-end"
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIChatDialog;