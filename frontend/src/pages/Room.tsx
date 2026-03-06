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
import { Share, LogOut, Check, Trash2, Sparkles, MessageSquareOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AIChatPanel from '@/components/ai-chat-panel';
import SplitMarkdownEditor from '@/components/split-markdown-editor';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const wsRef = useRef(null);
  const textareaRef = useRef(null);
  const isUpdatingFromWS = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  useEffect(() => {
    if (!roomId || roomId.length !== 6) {
      navigate('/');
      return;
    }

    const connectWebSocket = () => {
      const backendURL = import.meta.env.VITE_BACKEND_URL;
      
      // Convert HTTP to WebSocket protocol for cloud deployments
      const wsURL = backendURL.replace(/^https?:\/\//, (match) => 
        match === 'https://' ? 'wss://' : 'ws://'
      );
      
      const ws = new WebSocket(`${wsURL}/ws?room=${roomId}`);
      wsRef.current = ws;

      let didReceiveOpen = false;
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (!didReceiveOpen) {
          console.log('Connection timeout, closing...');
          ws.close();
        }
      }, 10000); // 10 second timeout

      ws.onopen = () => {
        didReceiveOpen = true;
        clearTimeout(connectionTimeout);
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
        console.log('WebSocket connected');
        setIsBackendConnected(true);
        toast({
          title: "Backend Connected",
          description: "Real-time collaboration is active",
        });

        // Start ping interval to keep connection alive (more aggressive for cloud)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000); // Ping every 25 seconds (more frequent for cloud)
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
          } else if (data.type === 'pong') {
            // Received pong response, connection is alive
            console.log('Received pong from server');
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        clearTimeout(connectionTimeout);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed', event.code, event.reason);
        clearTimeout(connectionTimeout);
        setIsBackendConnected(false);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (!didReceiveOpen && event.code === 1006) {
          toast({
            title: "Connection Failed",
            description: "Could not connect to server. Check if backend is running.",
            variant: "destructive"
          });
          return;
        }

        if (!didReceiveOpen) {
          toast({
            title: "Room Not Found",
            description: "The room you're trying to join doesn't exist.",
            variant: "destructive"
          });
          navigate('/');
        } else {
          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            reconnectAttempts.current++;
            
            toast({
              title: "Connection Lost",
              description: `Reconnecting in ${Math.ceil(backoffDelay / 1000)} seconds... (${reconnectAttempts.current}/${maxReconnectAttempts})`,
              variant: "destructive"
            });
            
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`Reconnect attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
              connectWebSocket();
            }, backoffDelay);
          } else {
            toast({
              title: "Connection Failed",
              description: "Max reconnection attempts reached. Please refresh the page.",
              variant: "destructive"
            });
          }
        }
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId, navigate, toast]);

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

  return (
    <div className="min-h-screen bg-onedark-background p-2">
      <div className="max-w-[1800px] mx-auto space-y-2">
        {/* ── Toolbar ─────────────────────────────────────────────── */}
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
            {/* AI Chat toggle */}
            <button
              onClick={() => setIsChatOpen(prev => !prev)}
              className={`group relative overflow-hidden rounded-md px-3 py-2 sm:px-4 sm:py-2 transition-all duration-300 transform hover:scale-105 shadow-lg ${
                isChatOpen
                  ? 'bg-onedark-selection border border-onedark-blue/60 text-onedark-blue'
                  : 'bg-gradient-to-r from-onedark-blue via-onedark-purple to-onedark-cyan text-white'
              }`}
            >
              {!isChatOpen && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              )}
              <div className="relative flex items-center text-xs sm:text-sm font-medium gap-1.5">
                {isChatOpen ? (
                  <MessageSquareOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                <span className="hidden xs:inline">{isChatOpen ? 'Close Chat' : 'AI Chat'}</span>
                <span className="xs:hidden">AI</span>
              </div>
            </button>

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

        {/* ── Editor + Chat layout ────────────────────────────────── */}
        <div className={`flex gap-3 ${isChatOpen ? 'flex-col lg:flex-row' : ''}`}>
          {/* Editor */}
          <div className={isChatOpen ? 'lg:flex-1 min-w-0' : 'w-full'}>
            <SplitMarkdownEditor
              value={text}
              onChange={(newText) => {
                setText(newText);
                if (
                  !isUpdatingFromWS.current &&
                  wsRef.current &&
                  wsRef.current.readyState === WebSocket.OPEN
                ) {
                  wsRef.current.send(
                    JSON.stringify({ type: 'text_update', content: newText })
                  );
                }
              }}
              textareaRef={textareaRef}
              placeholder="Start typing… "
            />
          </div>

          {/* Chat Panel */}
          {isChatOpen && (
            <div className="lg:w-[420px] xl:w-[480px] flex-shrink-0 h-[85vh] min-h-[700px] max-h-[90vh]">
              <AIChatPanel
                text={text}
                onInsertToEditor={handleInsertToEditor}
                onInsertCodeOnly={handleInsertCodeOnly}
              />
            </div>
          )}
        </div>

        {/* ── Footer actions ──────────────────────────────────────── */}
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setText('');
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'text_update', content: '' }));
              }
              toast({
                title: 'Editor Cleared',
                description: 'All content has been deleted from the editor',
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
  );
};

export default Room;
