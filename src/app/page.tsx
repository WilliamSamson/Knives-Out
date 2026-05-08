'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Search, Plus, UserCircle2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');

  const handleCreateRoom = () => {
    if (!playerName) return;
    const newRoomId = Math.random().toString(36).substring(7);
    router.push(`/game/${newRoomId}?name=${encodeURIComponent(playerName)}&host=true`);
  };

  const handleJoinRoom = () => {
    if (!playerName || !roomId) return;
    router.push(`/game/${roomId}?name=${encodeURIComponent(playerName)}`);
  };

  return (
    <div className="mystery-gradient min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-6xl font-headline italic tracking-tighter text-white">Knives Out</h1>
          <p className="text-muted-foreground font-body italic">"6 Friends, 1 Death. Everyone is a Suspect."</p>
        </div>

        <Card className="bg-card/80 backdrop-blur-md border-border/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Enter the Mansion</CardTitle>
            <CardDescription className="font-body">Identify yourself before the investigation begins.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <UserCircle2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Your Name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 focus:border-accent"
              />
            </div>
            
            <div className="relative pt-4 border-t border-border/50 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Room Code"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="bg-background/50 border-border/50 focus:border-accent"
                />
                <Button 
                  onClick={handleJoinRoom}
                  disabled={!playerName || !roomId}
                  variant="secondary"
                  className="bg-accent/20 hover:bg-accent/30 text-accent font-bold px-6"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Join
                </Button>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              <Button 
                onClick={handleCreateRoom}
                disabled={!playerName}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-headline text-lg tracking-wide accent-glow"
              >
                <Plus className="h-5 w-5 mr-2" />
                Host a Private Mystery
              </Button>
            </div>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-xs text-muted-foreground font-body">A maximum of 6 players per investigation.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}