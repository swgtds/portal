import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Share, LogOut, Copy, Check, Sparkles, Send, User, Bot, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { codeToHtml } from 'shiki';


const CodeBlock = ({ children, language = 'text' }) => {
  const [highlightedCode, setHighlightedCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const highlightCode = async () => {
      try {
        setIsLoading(true);
        const html = await codeToHtml(children, {
          lang: language || 'text',
          theme: 'one-dark-pro'
        });
        
        const cleanedHtml = html
          .replace(/^<pre[^>]*><code[^>]*>/, '')
          .replace(/<\/code><\/pre>$/, '');
        
        setHighlightedCode(cleanedHtml);
      } catch (error) {
        console.error('Shiki highlighting error:', error);

        setHighlightedCode(`<span class="shiki-fallback">${children}</span>`);
      } finally {
        setIsLoading(false);
      }
    };

    if (children) {
      highlightCode();
    }
  }, [children, language]);

  if (isLoading) {
    return (
      <div className="rounded-md overflow-hidden my-2 border border-onedark-comment bg-[#282c34]">
        {language && language !== 'text' && (
          <div className="px-3 py-2 text-xs font-mono border-b border-onedark-comment bg-[rgba(92,99,112,0.1)] text-[#5c6370]">
            {language}
          </div>
        )}
        <pre className="p-4 overflow-x-auto m-0 bg-[#282c34]">
          <code className="text-sm font-mono leading-relaxed text-[#abb2bf] animate-pulse">
            Loading syntax highlighting...
          </code>
        </pre>
      </div>
    );
  }

  return (
    <div className="rounded-md overflow-hidden my-2 border border-onedark-comment bg-[#282c34]">
      {language && language !== 'text' && (
        <div className="px-3 py-2 text-xs font-mono border-b border-onedark-comment bg-[rgba(92,99,112,0.1)] text-[#5c6370]">
          {language}
        </div>
      )}
      <pre className="p-4 overflow-x-auto m-0 bg-[#282c34]">
        <div 
          className="text-sm font-mono leading-relaxed shiki-container"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
          style={{
            background: 'transparent',
          }}
        />
      </pre>
      <style>{`
        .shiki-container code {
          background: transparent !important;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
        }
        .shiki-fallback {
          color: #abb2bf;
        }
      `}</style>
    </div>
  );
};

const ChatMessage = ({ message, onInsertToEditor, onInsertCodeOnly }) => {
  const formatContent = (content) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let hasCode = false;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      hasCode = true;
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index)
        });
      }
      
      parts.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2].trim()
      });
      
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex)
      });
    }

    return { 
      parts: parts.length > 0 ? parts : [{ type: 'text', content }], 
      hasCode 
    };
  };

  const { parts, hasCode } = formatContent(message.content);

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
          {parts.map((part, index) => (
            <div key={index}>
              {part.type === 'text' ? (
                <div className="whitespace-pre-wrap leading-relaxed">
                  {part.content}
                </div>
              ) : (
                <CodeBlock language={part.language}>
                  {part.content}
                </CodeBlock>
              )}
            </div>
          ))}
        </div>
        
        {message.type === 'ai' && (
          <div className="flex flex-wrap gap-2 mt-3">
            {hasCode && (
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

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const wsRef = useRef(null);
  const textareaRef = useRef(null);
  const isUpdatingFromWS = useRef(false);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!roomId || roomId.length !== 6) {
      navigate('/');
      return;
    }

    const backendURL = import.meta.env.VITE_BACKEND_URL;
    const ws = new WebSocket(`${backendURL}/ws?room=${roomId}`);
    wsRef.current = ws;

    let didReceiveOpen = false;

    ws.onopen = () => {
      didReceiveOpen = true;
      console.log('WebSocket connected');
      setIsBackendConnected(true);
      toast({
        title: "Backend Connected",
        description: "Real-time collaboration is active",
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'text_update') {
          isUpdatingFromWS.current = true;
          setText(data.content);
          setTimeout(() => {
            isUpdatingFromWS.current = false;
          }, 0);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      if (!didReceiveOpen) {
        toast({
          title: "Room Not Found",
          description: "The room you're trying to join doesn't exist.",
          variant: "destructive"
        });
        navigate('/');
      } else {
        setIsBackendConnected(false);
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [roomId, navigate, toast]);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);

    if (
      !isUpdatingFromWS.current &&
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN
    ) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text_update',
          content: newText,
        })
      );
    }
  };

  const handleShareRoom = async () => {
    const roomUrl = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      toast({
        title: "Room URL Copied!",
        description: "Share this link with others to collaborate",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "Copy Failed",
        description: "Please copy the URL manually from the address bar",
        variant: "destructive",
      });
    }
  };

  const handleExitRoom = () => {
    navigate('/');
  };

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

    const userMessage = {
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

      const conversationHistory = chatMessages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      let contextualPrompt = currentPrompt;
      if (text.trim()) {
        contextualPrompt = `Context from editor:\n\`\`\`\n${text}\n\`\`\`\n\nUser question: ${currentPrompt}`;
      }

      conversationHistory.push({
        role: 'user',
        parts: [{ text: contextualPrompt }]
      });

      // UPDATED MODEL to gemini-2.5-flash for v1beta compatibility
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

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: generatedText,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Gemini API error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate AI response. Please check your API key and try again.",
        variant: "destructive",
      });

      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: `Error: ${error.message || "Failed to generate response"}`,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertToEditor = (content) => {
    const newText = text + (text ? '\n\n' : '') + content;
    setText(newText);
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'text_update',
        content: newText
      }));
    }
    
    toast({
      title: "Full Text Inserted",
      description: "AI response has been added to the editor",
    });
  };

  const handleInsertCodeOnly = (content) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let codeSnippets = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeSnippets.push(match[2].trim());
    }

    if (codeSnippets.length > 0) {
      const codeToInsert = codeSnippets.join('\n\n');
      const newText = text + (text ? '\n\n' : '') + codeToInsert;
      setText(newText);
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'text_update',
          content: newText
        }));
      }
      
      toast({
        title: "Code Snippets Inserted",
        description: `${codeSnippets.length} code snippet(s) added to the editor`,
      });
    } else {
      toast({
        title: "No Code Found",
        description: "No code blocks found in this response",
        variant: "destructive",
      });
    }
  };

  const handlePromptKeyDown = (e) => {
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

  return (
    <div className="min-h-screen bg-onedark-background p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 min-w-0">
            <h1 className="text-xl font-semibold text-onedark-foreground truncate">
              Room <span className="text-onedark-blue font-mono">{roomId}</span>
            </h1>
            <span
              className={`text-sm font-medium ${
                isBackendConnected ? 'text-onedark-green' : 'text-onedark-red'
              }`}
            >
              {isBackendConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Dialog open={isAIChatOpen} onOpenChange={setIsAIChatOpen}>
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
              <DialogContent className="bg-onedark-background border-onedark-selection max-w-4xl mx-4 sm:mx-auto max-h-[85vh] p-0">
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
                
                <div className="flex flex-col h-[70vh]">
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
                        <ChatMessage
                          key={message.id}
                          message={message}
                          onInsertToEditor={handleInsertToEditor}
                          onInsertCodeOnly={handleInsertCodeOnly}
                        />
                      ))
                    )}
                    
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
                  
                  <div className="border-t border-onedark-comment p-4">
                    <div className="flex gap-3">
                      <Textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={handlePromptKeyDown}
                        placeholder="Type your message... (Shift+Enter for new line, Enter to send)"
                        className="bg-onedark-selection border-onedark-comment text-onedark-foreground placeholder:text-onedark-comment focus:ring-onedark-blue focus:border-transparent min-h-[60px] resize-none text-sm"
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

            <Button
              onClick={handleShareRoom}
              variant="outline"
              size="sm"
              className="border-onedark-selection bg-transparent hover:bg-onedark-selection text-onedark-foreground"
            >
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Share className="mr-2 h-4 w-4" />}
              {copied ? 'Copied!' : 'Share'}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-onedark-red/50 bg-transparent hover:bg-onedark-red/10 text-onedark-red"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Exit
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-onedark-background border-onedark-selection">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-onedark-foreground">
                    Exit Room?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-onedark-comment">
                    Are you sure you want to leave this session? Your AI chat history will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-onedark-comment text-onedark-foreground hover:bg-onedark-selection">
                    Stay
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleExitRoom}
                    className="bg-onedark-red hover:bg-onedark-red/80 text-white"
                  >
                    Exit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder="Start typing..."
            className="w-full h-[calc(100vh-180px)] p-6 bg-onedark-selection border border-onedark-comment rounded-lg text-onedark-foreground placeholder:text-onedark-comment resize-none focus:outline-none focus:ring-2 focus:ring-onedark-blue focus:border-transparent text-base leading-relaxed font-mono"
            spellCheck={false}
          />
          
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setText('');
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({
                    type: 'text_update',
                    content: ''
                  }));
                }
                toast({
                  title: "Editor Cleared",
                  description: "All content has been deleted from the editor",
                });
              }}
              variant="outline"
              size="sm"
              className="border-onedark-red/50 bg-transparent hover:bg-onedark-red/10 text-onedark-red"
              disabled={!text.trim()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;