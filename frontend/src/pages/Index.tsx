import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const handleCreateRoom = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/create`);
      const data = await response.json();
      if (data.roomID) {
        navigate(`/room/${data.roomID}`);
      } else {
        throw new Error('No room ID returned');
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room. Backend might not be running.');
    }
  };

  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setRoomId(value);
  };

  useEffect(() => {
    if (roomId.length === 6) {
      navigate(`/room/${roomId}`);
    }
  }, [roomId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-onedark-background via-onedark-background to-onedark-selection flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blur elements */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-onedark-blue/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-onedark-purple/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-onedark-green/10 rounded-full blur-2xl animate-pulse delay-500"></div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-onedark-foreground">
            Por<span className="text-onedark-blue">tal</span>
          </h1>
          <p className="text-onedark-comment">Your Gateway to Seamless Communication</p>
        </div>

        {/* Action Cards */}
        <div className="space-y-4">
          {/* Create Room Card */}
          <Card className="bg-onedark-selection/40 backdrop-blur-xl border-onedark-comment/30 hover:bg-onedark-selection/60 transition-all duration-300">
            <CardContent className="p-6">
              <Button
                onClick={handleCreateRoom}
                className="w-full h-12 bg-gradient-to-r from-onedark-blue to-onedark-purple hover:from-onedark-blue/80 hover:to-onedark-purple/80 text-white font-medium transition-all duration-300"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Room
              </Button>
            </CardContent>
          </Card>

          {/* Divider */}
          <div className="flex items-center justify-center space-x-2">
            <div className="flex-grow h-px bg-onedark-comment/30"></div>
            <span className="text-onedark-comment text-sm">or join using a Room-Code</span>
            <div className="flex-grow h-px bg-onedark-comment/30"></div>
          </div>

          {/* Join Room Input */}
          <Card className="bg-onedark-selection/40 backdrop-blur-xl border-onedark-comment/30 hover:bg-onedark-selection/60 transition-all duration-300">
            <CardContent className="p-6 space-y-4">
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={roomId}
                onChange={handleRoomIdChange}
                className="bg-onedark-background/50 border-onedark-comment/50 text-onedark-foreground placeholder:text-onedark-comment text-center tracking-widest font-mono h-12 backdrop-blur-sm focus:border-onedark-green focus:ring-onedark-green/30"
                maxLength={6}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
