import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Share, LogOut, Check, Trash2, Sparkles, MessageSquareOff, Users, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AIChatPanel from '@/components/ai-chat-panel';
import RoomChatPanel, { RoomChatMessage } from '@/components/room-chat-panel';
import SplitMarkdownEditor from '@/components/split-markdown-editor';

/** Generate a random guest name that persists for the session */
function getUsername(): string {
  const key = 'portal_username';
  const stored = sessionStorage.getItem(key);
  if (stored) return stored;
  const adjectives = ['Swift', 'Quiet', 'Bold', 'Calm', 'Bright', 'Dark', 'Fuzzy', 'Snappy'];
  const nouns = ['Fox', 'Owl', 'Bee', 'Cat', 'Wolf', 'Bear', 'Lynx', 'Hawk'];
  const name =
    adjectives[Math.floor(Math.random() * adjectives.length)] +
    nouns[Math.floor(Math.random() * nouns.length)] +
    Math.floor(Math.random() * 100);
  sessionStorage.setItem(key, name);
  return name;
}

type ChatTab = 'room' | 'ai';

// Helper functions for localStorage persistence
function getStoredContent(roomId: string, key: 'text' | 'code'): string {
  try {
    return localStorage.getItem(`room_${roomId}_${key}`) || '';
  } catch {
    return '';
  }
}

function setStoredContent(roomId: string, key: 'text' | 'code', content: string) {
  try {
    localStorage.setItem(`room_${roomId}_${key}`, content);
  } catch {
    // ignore quota errors
  }
}

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [text, setText] = useState(() => getStoredContent(roomId || '', 'text'));
  const [code, setCode] = useState(() => getStoredContent(roomId || '', 'code'));
  const [copied, setCopied] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatTab>('room');
  const [roomMessages, setRoomMessages] = useState<RoomChatMessage[]>([]);
  const [unreadRoom, setUnreadRoom] = useState(0);

  const wsRef = useRef(null);
  const textareaRef = useRef(null);
  const isUpdatingTextFromWS = useRef(false);
  const isUpdatingCodeFromWS = useRef(false);
  const hasReceivedInitial = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const username = useRef(getUsername()).current;

  // Track whether panel + room tab is visible to suppress unread badge (use ref for WebSocket closure)
  const isRoomTabVisible = isPanelOpen && activeTab === 'room';
  const isRoomTabVisibleRef = useRef(isRoomTabVisible);
  isRoomTabVisibleRef.current = isRoomTabVisible;

  // Persist content to localStorage whenever it changes
  useEffect(() => {
    if (roomId) setStoredContent(roomId, 'text', text);
  }, [roomId, text]);

  useEffect(() => {
    if (roomId) setStoredContent(roomId, 'code', code);
  }, [roomId, code]);

  useEffect(() => {
    if (!roomId || roomId.length !== 6) {
      navigate('/');
      return;
    }

    const connectWebSocket = () => {
      const backendURL = import.meta.env.VITE_BACKEND_URL;
      const wsURL = backendURL.replace(/^https?:\/\//, (match) =>
        match === 'https://' ? 'wss://' : 'ws://'
      );

      const ws = new WebSocket(`${wsURL}/ws?room=${roomId}`);
      wsRef.current = ws;

      let didReceiveOpen = false;

      const connectionTimeout = setTimeout(() => {
        if (!didReceiveOpen) ws.close();
      }, 10000);

      ws.onopen = () => {
        didReceiveOpen = true;
        clearTimeout(connectionTimeout);
        reconnectAttempts.current = 0;
        hasReceivedInitial.current = false;
        setIsBackendConnected(true);
        toast({ title: 'Backend Connected', description: 'Real-time collaboration is active' });

        // Allow initial content from server to arrive before enabling outbound sends
        // After receiving initial content, sync any local content that might not be on server
        setTimeout(() => {
          hasReceivedInitial.current = true;
          // If we have local content and connection is still open, ensure it's synced
          // This helps recover from cases where content wasn't sent before
        }, 500);

        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'text_update') {
            isUpdatingTextFromWS.current = true;
            setText(data.content);
            requestAnimationFrame(() => { isUpdatingTextFromWS.current = false; });
          } else if (data.type === 'code_update') {
            isUpdatingCodeFromWS.current = true;
            setCode(data.content);
            requestAnimationFrame(() => { isUpdatingCodeFromWS.current = false; });
          } else if (data.type === 'pong') {
            // keep-alive
          } else if (data.type === 'chat_message') {
            const isOwn = data.sender === username;
            setRoomMessages(prev => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                sender: data.sender,
                content: data.content,
                timestamp: new Date().toISOString(),
                isOwn,
              },
            ]);
            // Bump unread badge if panel/tab is not currently showing
            if (!isOwn) {
              setUnreadRoom(prev => (isRoomTabVisibleRef.current ? 0 : prev + 1));
            }
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
        clearTimeout(connectionTimeout);
        setIsBackendConnected(false);
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (!didReceiveOpen && event.code === 1006) {
          toast({ title: 'Connection Failed', description: 'Could not connect to server.', variant: 'destructive' });
          return;
        }
        if (!didReceiveOpen) {
          toast({ title: 'Room Not Found', description: "The room you're trying to join doesn't exist.", variant: 'destructive' });
          navigate('/');
        } else if (reconnectAttempts.current < maxReconnectAttempts) {
          const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          toast({
            title: 'Connection Lost',
            description: `Reconnecting in ${Math.ceil(backoffDelay / 1000)}s… (${reconnectAttempts.current}/${maxReconnectAttempts})`,
            variant: 'destructive',
          });
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, backoffDelay);
        } else {
          toast({ title: 'Connection Failed', description: 'Max reconnection attempts reached.', variant: 'destructive' });
        }
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [roomId, navigate, toast]);

  // Clear unread when user opens the room tab
  useEffect(() => {
    if (isRoomTabVisible) setUnreadRoom(0);
  }, [isRoomTabVisible]);

  const handleShareRoom = async () => {
    const roomUrl = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      toast({ title: 'Room URL Copied!', description: 'Share this link with others to collaborate' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy Failed', description: 'Please copy the URL manually from the address bar', variant: 'destructive' });
    }
  };

  const handleExitRoom = () => navigate('/');

  const handleInsertToEditor = (content: string) => {
    const newText = text + (text ? '\n\n' : '') + content;
    setText(newText);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text_update', content: newText }));
    }
    toast({ title: 'Full Text Inserted', description: 'AI response has been added to the editor' });
  };

  const handleInsertCodeOnly = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const codeSnippets: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeSnippets.push(match[2].trim());
    }
    if (codeSnippets.length > 0) {
      const codeToInsert = codeSnippets.join('\n\n');
      const newCode = code + (code ? '\n\n' : '') + codeToInsert;
      setCode(newCode);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'code_update', content: newCode }));
      }
      toast({ title: 'Code Snippets Inserted', description: `${codeSnippets.length} snippet(s) added to Code editor` });
    } else {
      toast({ title: 'No Code Found', description: 'No code blocks found in this response', variant: 'destructive' });
    }
  };

  const handleSendRoomChat = useCallback((msg: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast({ title: 'Not connected', description: 'Reconnecting…', variant: 'destructive' });
      return;
    }
    wsRef.current.send(JSON.stringify({ type: 'chat_message', content: msg, sender: username }));
  }, [username, toast]);

  const openTab = (tab: ChatTab) => {
    setActiveTab(tab);
    setIsPanelOpen(true);
  };

  return (
    <div className="min-h-screen bg-onedark-background p-2 flex flex-col">
      <div className="max-w-[1800px] mx-auto w-full flex flex-col flex-1 gap-2">

        {/* ── Toolbar ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h1 className="text-base sm:text-xl font-semibold text-onedark-foreground truncate">
              Room <span className="text-onedark-blue font-mono">{roomId}</span>
            </h1>
            <span className={`text-xs sm:text-sm font-medium flex-shrink-0 ${isBackendConnected ? 'text-onedark-green' : 'text-onedark-red'}`}>
              {isBackendConnected ? '● Connected' : '● Disconnected'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Room Chat toggle */}
            <button
              onClick={() => isPanelOpen && activeTab === 'room' ? setIsPanelOpen(false) : openTab('room')}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 border ${
                isPanelOpen && activeTab === 'room'
                  ? 'bg-onedark-green/20 border-onedark-green/60 text-onedark-green'
                  : 'bg-transparent border-onedark-selection text-onedark-foreground hover:bg-onedark-selection'
              }`}
            >
              <Users size={14} />
              <span className="hidden sm:inline">Chat</span>
              {unreadRoom > 0 && !(isPanelOpen && activeTab === 'room') && (
                <span className="absolute -top-1 -right-1 bg-onedark-red text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {unreadRoom > 9 ? '9+' : unreadRoom}
                </span>
              )}
            </button>

            {/* AI Chat toggle */}
            <button
              onClick={() => isPanelOpen && activeTab === 'ai' ? setIsPanelOpen(false) : openTab('ai')}
              className={`group relative overflow-hidden flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                isPanelOpen && activeTab === 'ai'
                  ? 'bg-onedark-selection border border-onedark-blue/60 text-onedark-blue'
                  : 'bg-gradient-to-r from-onedark-blue via-onedark-purple to-onedark-cyan text-white border border-transparent'
              }`}
            >
              {!(isPanelOpen && activeTab === 'ai') && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
              <Sparkles size={14} className="relative" />
              <span className="hidden sm:inline relative">AI</span>
            </button>

            <Button onClick={handleShareRoom} variant="outline" size="sm"
              className="border-onedark-selection bg-transparent hover:bg-onedark-selection text-onedark-foreground h-8 px-2 sm:px-3">
              {copied ? <Check size={14} /> : <Share size={14} />}
              <span className="hidden sm:inline ml-1.5">{copied ? 'Copied!' : 'Share'}</span>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm"
                  className="border-onedark-red/50 bg-transparent hover:bg-onedark-red/10 text-onedark-red h-8 px-2 sm:px-3">
                  <LogOut size={14} />
                  <span className="hidden sm:inline ml-1.5">Exit</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-onedark-background border-onedark-selection mx-4">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-onedark-foreground">Exit Room?</AlertDialogTitle>
                  <AlertDialogDescription className="text-onedark-comment">
                    Are you sure you want to leave this session?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-onedark-comment text-onedark-foreground hover:bg-onedark-selection">Stay</AlertDialogCancel>
                  <AlertDialogAction onClick={handleExitRoom} className="bg-onedark-red hover:bg-onedark-red/80 text-white">Exit</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* ── Editor + Panel layout ───────────────────────────────── */}
        {/* Desktop: side-by-side. Mobile: editor on top, panel below as a sheet */}
        <div className="flex flex-col lg:flex-row gap-2 flex-1 min-h-0">
          {/* Editor */}
          <div className={`${isPanelOpen ? 'lg:flex-1 min-w-0 h-[50vh] lg:h-auto' : 'w-full'}`}>
            <SplitMarkdownEditor
              textValue={text}
              codeValue={code}
              onTextChange={(newText) => {
                setText(newText);
                if (!isUpdatingTextFromWS.current && hasReceivedInitial.current && wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ type: 'text_update', content: newText }));
                }
              }}
              onCodeChange={(newCode) => {
                setCode(newCode);
                if (!isUpdatingCodeFromWS.current && hasReceivedInitial.current && wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ type: 'code_update', content: newCode }));
                }
              }}
              storageKey={roomId}
              textareaRef={textareaRef}
              placeholder="Start typing… "
            />
          </div>

          {/* Side Panel */}
          {isPanelOpen && (
            <div className="
              lg:w-[420px] xl:w-[480px] flex-shrink-0
              h-[55vh] lg:h-auto
              lg:min-h-[700px] lg:max-h-[90vh]
              flex flex-col
            ">
              {/* Tab switcher (only shown when panel is open) */}
              <div className="flex rounded-t-lg border-2 border-b-0 border-onedark-selection overflow-hidden">
                <button
                  onClick={() => setActiveTab('room')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'room'
                      ? 'bg-onedark-selection/60 text-onedark-green border-b-2 border-onedark-green'
                      : 'bg-onedark-background/60 text-onedark-comment hover:text-onedark-foreground'
                  }`}
                >
                  <Users size={13} />
                  Room Chat
                  {unreadRoom > 0 && activeTab !== 'room' && (
                    <span className="bg-onedark-red text-white text-[9px] font-bold rounded-full min-w-[15px] h-3.5 flex items-center justify-center px-1">
                      {unreadRoom > 9 ? '9+' : unreadRoom}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'ai'
                      ? 'bg-onedark-selection/60 text-onedark-blue border-b-2 border-onedark-blue'
                      : 'bg-onedark-background/60 text-onedark-comment hover:text-onedark-foreground'
                  }`}
                >
                  <Bot size={13} />
                  AI Chat
                </button>
              </div>

              {/* Panel content — fills remaining height */}
              <div className="flex-1 min-h-0 [&>div]:rounded-t-none [&>div]:border-t-0">
                {activeTab === 'room' ? (
                  <RoomChatPanel
                    messages={roomMessages}
                    onSend={handleSendRoomChat}
                    username={username}
                  />
                ) : (
                  <AIChatPanel
                    text={text + (code ? '\n\n--- Code ---\n' + code : '')}
                    onInsertToEditor={handleInsertToEditor}
                    onInsertCodeOnly={handleInsertCodeOnly}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setText('');
              setCode('');
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'text_update', content: '' }));
                wsRef.current.send(JSON.stringify({ type: 'code_update', content: '' }));
              }
              toast({ title: 'Editor Cleared', description: 'All content has been deleted from both editors' });
            }}
            variant="outline"
            size="sm"
            className="border-onedark-red/50 bg-transparent hover:bg-onedark-red/10 text-onedark-red"
            disabled={!text.trim() && !code.trim()}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete All
          </Button>
        </div>

      </div>
    </div>
  );
};

export default Room;
