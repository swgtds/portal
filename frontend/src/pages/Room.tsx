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
import { Share, LogOut, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUpdatingFromWS = useRef(false);

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

  return (
    <div className="min-h-screen bg-onedark-background p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-onedark-foreground">
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
                    Are you sure you want to leave this session?
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

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          placeholder="Start typing..."
          className="w-full h-[calc(100vh-120px)] p-6 bg-onedark-selection border border-onedark-comment rounded-lg text-onedark-foreground placeholder:text-onedark-comment resize-none focus:outline-none focus:ring-2 focus:ring-onedark-blue focus:border-transparent text-base leading-relaxed font-mono"
          spellCheck={false}
        />
      </div>
    </div>
  );
};

export default Room;
