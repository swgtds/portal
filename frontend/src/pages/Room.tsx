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

// syntax highlighting component
const CodeBlock = ({ children, language = '' }) => {
  const codeRef = useRef(null);

  const highlightSyntax = (code, lang) => {
    const patterns = {
      javascript: [
        { pattern: /(function|const|let|var|if|else|for|while|return|class|import|export|from|async|await|try|catch|finally)/g, class: 'text-onedark-purple' },
        { pattern: /(true|false|null|undefined|this)/g, class: 'text-onedark-cyan' },
        { pattern: /(".*?"|'.*?'|`.*?`)/g, class: 'text-onedark-green' },
        { pattern: /(\/\/.*$)/gm, class: 'text-onedark-comment italic' },
        { pattern: /(\/\*[\s\S]*?\*\/)/g, class: 'text-onedark-comment italic' },
        { pattern: /(\d+)/g, class: 'text-onedark-red' }
      ],
      python: [
        { pattern: /(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|with|async|await|lambda)/g, class: 'text-onedark-purple' },
        { pattern: /(True|False|None|self)/g, class: 'text-onedark-cyan' },
        { pattern: /("""[\s\S]*?"""|'''[\s\S]*?'''|".*?"|'.*?')/g, class: 'text-onedark-green' },
        { pattern: /(#.*$)/gm, class: 'text-onedark-comment italic' },
        { pattern: /(\d+)/g, class: 'text-onedark-red' }
      ],
      css: [
        { pattern: /(color|background|margin|padding|border|width|height|font|display|position|flex|grid|transform|transition):/g, class: 'text-onedark-red' },
        { pattern: /(#[0-9a-fA-F]{3,6}|rgb\(.*?\)|rgba\(.*?\))/g, class: 'text-onedark-cyan' },
        { pattern: /(\/\*[\s\S]*?\*\/)/g, class: 'text-onedark-comment italic' },
        { pattern: /(\d+px|\d+em|\d+rem|\d+%)/g, class: 'text-onedark-red' }
      ],
      html: [
        { pattern: /(&lt;\/?[a-zA-Z][^&gt;]*&gt;)/g, class: 'text-onedark-red' },
        { pattern: /([a-zA-Z-]+)=/g, class: 'text-onedark-yellow' },
        { pattern: /(".*?"|'.*?')/g, class: 'text-onedark-green' }
      ]
    };

    let highlightedCode = code;
    const langPatterns = patterns[lang.toLowerCase()] || patterns.javascript;

    langPatterns.forEach(({ pattern, class: className }) => {
      highlightedCode = highlightedCode.replace(pattern, `<span class="${className}">$&</span>`);
    });

    return highlightedCode;
  };

  useEffect(() => {
    if (codeRef.current && children) {
      const highlighted = highlightSyntax(children, language);
      codeRef.current.innerHTML = highlighted;
    }
  }, [children, language]);

  return (
    <div className="bg-onedark-background border border-onedark-comment rounded-md overflow-hidden my-2">
      {language && (
        <div className="bg-onedark-comment/20 px-3 py-1 text-xs text-onedark-comment border-b border-onedark-comment font-mono">
          {language}
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code ref={codeRef} className="text-sm text-onedark-foreground font-mono">
          {children}
        </code>
      </pre>
    </div>
  );
};

// Editor with syntax highlighting
const EditorWithHighlighting = ({ value, onChange, placeholder, className, ...props }) => {
  const [processedContent, setProcessedContent] = useState({ parts: [], hasCodeBlocks: false });
  const overlayRef = useRef(null);
  const textareaRef = useRef(null);

  const processText = (text) => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let hasCodeBlocks = false;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      hasCodeBlocks = true;
      
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
          startIndex: lastIndex,
          endIndex: match.index
        });
      }
      
      parts.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        fullMatch: match[0]
      });
      
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
        startIndex: lastIndex,
        endIndex: text.length
      });
    }

    return { parts: parts.length > 0 ? parts : [{ type: 'text', content: text, startIndex: 0, endIndex: text.length }], hasCodeBlocks };
  };

  useEffect(() => {
    setProcessedContent(processText(value));
  }, [value]);

  const handleScroll = () => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div className="relative">
      {processedContent.hasCodeBlocks && (
        <div
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words font-mono text-base leading-relaxed p-6 z-10"
          style={{ color: '#abb2bf' }}
        >
          {processedContent.parts.map((part, index) => (
            <span key={index}>
              {part.type === 'text' ? (
                <span style={{ color: '#abb2bf' }}>{part.content}</span>
              ) : (
                <span className="inline-block w-full bg-onedark-background/90 border border-onedark-comment/70 rounded-md my-1 p-3">
                  {part.language && (
                    <div className="text-xs text-onedark-comment mb-2 font-mono">
                      {part.language}
                    </div>
                  )}
                  <SyntaxHighlighter code={part.content} language={part.language} />
                </span>
              )}
            </span>
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onScroll={handleScroll}
        placeholder={placeholder}
        className={`relative ${processedContent.hasCodeBlocks ? 'z-20 text-transparent caret-white bg-transparent' : 'z-10 text-onedark-foreground'} ${className}`}
        style={processedContent.hasCodeBlocks ? { caretColor: '#abb2bf' } : {}}
        spellCheck={false}
        {...props}
      />
    </div>
  );
};

const SyntaxHighlighter = ({ code, language }) => {
  const highlightCode = (text, lang) => {
    const tokens = text.split(/(\s+|[{}();,.])/);
    
    const getTokenColor = (token, lang) => {
      if (!token.trim()) return '#abb2bf';
      
      const keywords = {
        javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'finally'],
        python: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'async', 'await', 'lambda', 'pass', 'break', 'continue'],
        java: ['public', 'private', 'protected', 'static', 'final', 'abstract', 'class', 'interface', 'extends', 'implements', 'import', 'package', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'try', 'catch', 'finally', 'throw', 'throws', 'new', 'this', 'super', 'void', 'int', 'double', 'float', 'long', 'short', 'byte', 'char', 'boolean', 'String', 'System']
      };
      
      const booleans = {
        javascript: ['true', 'false', 'null', 'undefined', 'this'],
        python: ['True', 'False', 'None', 'self'],
        java: ['true', 'false', 'null']
      };
      
      const langKeywords = keywords[lang?.toLowerCase()] || keywords.javascript;
      const langBooleans = booleans[lang?.toLowerCase()] || booleans.javascript;
      
      if (langKeywords.includes(token)) return '#c678dd';

      if (langBooleans.includes(token)) return '#56b6c2';
      
      if ((token.startsWith('"') && token.endsWith('"')) || 
          (token.startsWith("'") && token.endsWith("'")) ||
          (token.startsWith('`') && token.endsWith('`'))) {
        return '#98c379';
      }
      
      if (/^\d+\.?\d*$/.test(token)) return '#d19a66';
      
      if (token.startsWith('//') || token.startsWith('#') || 
          (token.startsWith('/*') && token.endsWith('*/'))) {
        return '#5c6370';
      }
      
      if (/^[A-Z][a-zA-Z0-9_]*$/.test(token)) return '#e5c07b';
      return '#abb2bf';
    };

    return tokens.map((token, index) => {
      const color = getTokenColor(token, lang);
      return `<span key="${index}" style="color: ${color};">${token}</span>`;
    }).join('');
  };

  return (
    <span 
      className="font-mono text-sm leading-relaxed"
      style={{ color: '#abb2bf' }}
      dangerouslySetInnerHTML={{ 
        __html: highlightCode(code, language) 
      }}
    />
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
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const wsRef = useRef<WebSocket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUpdatingFromWS = useRef(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
    setAiPrompt('');
    setIsGenerating(true);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: aiPrompt
            }]
          }]
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

  const handlePromptKeyDown = (e: React.KeyboardEvent) => {
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