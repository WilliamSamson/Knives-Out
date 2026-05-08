'use client';

import { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { GameRoom, Player, GameStatus } from '@/app/lib/game-state';
import { generatePlayerCharacter } from '@/ai/flows/generate-player-character';
import { generateMurderMystery } from '@/ai/flows/generate-murder-mystery';
import { revealMurderResolution } from '@/ai/flows/reveal-murder-resolution';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Info, MapPin, Skull, Fingerprint, ShieldAlert, Vote, Gavel, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function GameRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const unwrappedParams = use(params);
  const roomId = unwrappedParams.roomId;
  const searchParams = useSearchParams();
  const playerName = searchParams.get('name') || 'Anonymous';
  const isHostParam = searchParams.get('host') === 'true';

  const [room, setRoom] = useState<GameRoom>({
    id: roomId,
    status: 'lobby',
    players: [],
    cluesDiscovered: [],
  });
  
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [interrogationText, setInterrogationText] = useState('');
  const [chatLogs, setChatLogs] = useState<{from: string, msg: string}[]>([]);

  // Defer ID generation to handle hydration correctly
  useEffect(() => {
    setLocalPlayerId(Math.random().toString(36).substring(7));
  }, []);

  // Simulation of multiplayer by adding a few dummy players if it's the host
  useEffect(() => {
    if (!localPlayerId) return;

    const me: Player = {
      id: localPlayerId,
      name: playerName,
      isHost: isHostParam,
      ready: false,
    };
    
    // In a real app, this would be a socket or firebase listener
    if (isHostParam && room.players.length === 0) {
      const dummyPlayers: Player[] = [
        { id: '2', name: 'Detective Benoit', isHost: false, ready: true },
        { id: '3', name: 'Lady Eleanor', isHost: false, ready: true },
        { id: '4', name: 'Professor Plum', isHost: false, ready: true },
        { id: '5', name: 'Madame Rose', isHost: false, ready: true },
        { id: '6', name: 'Arthur Penhaligon', isHost: false, ready: true },
      ];
      setRoom(prev => ({ ...prev, players: [me, ...dummyPlayers] }));
    } else if (room.players.length === 0) {
      setRoom(prev => ({ ...prev, players: [me] }));
    }
  }, [roomId, playerName, isHostParam, localPlayerId]);

  const startGame = async () => {
    setRoom(prev => ({ ...prev, status: 'generating' }));
    setLoadingMsg('Generating the perfect crime...');

    try {
      // 1. Generate the Mystery
      const mystery = await generateMurderMystery({ setting: 'A secluded winter manor in the mountains.' });
      setLoadingMsg('Forging character backstories and motives...');

      // 2. Assign characters to players (in real app, loop players)
      const playerCharPromises = room.players.map((p, i) => {
        return generatePlayerCharacter({
          gameSetting: 'A secluded winter manor in the mountains. One of your friends is dead.',
          existingCharacterSummaries: room.players.slice(0, i).map(cp => cp.character?.characterName || '')
        });
      });

      const characters = await Promise.all(playerCharPromises);
      
      const updatedPlayers = room.players.map((p, i) => ({
        ...p,
        character: characters[i]
      }));

      setRoom(prev => ({
        ...prev,
        status: 'investigation',
        players: updatedPlayers,
        mystery: mystery,
        cluesDiscovered: mystery.clues.slice(0, 2) // Start with 2 discovered clues
      }));
    } catch (e) {
      console.error(e);
      setRoom(prev => ({ ...prev, status: 'lobby' }));
    }
  };

  const handleInterrogation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interrogationText) return;
    setChatLogs(prev => [...prev, { from: playerName, msg: interrogationText }]);
    setInterrogationText('');
  };

  const moveToAccusation = () => {
    setRoom(prev => ({ ...prev, status: 'accusation' }));
  };

  const castVote = (victimId: string) => {
    setRoom(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === localPlayerId ? { ...p, voteId: victimId } : p)
    }));
  };

  const revealTruth = async () => {
    if (!room.mystery) return;
    setRoom(prev => ({ ...prev, status: 'generating' }));
    setLoadingMsg('Connecting the clues...');

    const resolution = await revealMurderResolution({
      gameScenario: {
        victim: room.mystery.victim,
        trueKiller: room.mystery.suspects.find(s => s.isKiller)!,
        allCharacterAlibis: room.mystery.suspects.map(s => ({ characterName: s.name, alibi: s.alibi })),
        clues: room.mystery.clues.map(c => ({ description: c, relevance: 'Hidden detail' })),
        eventsChronology: ['Dinner was served at 8:00', 'Power went out at 10:15', 'Victim was found at 11:00']
      }
    });

    setRoom(prev => ({ ...prev, status: 'revelation', revelation: resolution.recapNarrative }));
  };

  const me = room.players.find(p => p.id === localPlayerId);

  if (room.status === 'lobby') {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-headline italic">The Lobby</h1>
            <p className="text-muted-foreground">Waiting for the group to assemble...</p>
          </div>
          <Badge variant="outline" className="text-accent border-accent px-4 py-1">
            Room Code: {roomId}
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                <Users className="h-5 w-5" />
                Players ({room.players.length}/6)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {room.players.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold">
                        {p.name[0]}
                      </div>
                      <span className="font-body">{p.name} {p.id === localPlayerId && "(You)"}</span>
                    </div>
                    {p.isHost && <Badge className="bg-accent/20 text-accent hover:bg-accent/20">Host</Badge>}
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 6 - room.players.length) }).map((_, i) => (
                  <div key={i} className="p-3 border border-dashed border-border/30 rounded-lg text-muted-foreground text-sm text-center">
                    Awaiting guest...
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg font-headline">Premise</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm leading-relaxed">
                6 friends meet for what was supposed to be a celebratory weekend. But as the snow piles up and the phone lines go down, one of you ends up dead. Every person in this room has a secret. Every person has a motive. No one is above suspicion.
              </CardContent>
            </Card>
            
            {me?.isHost && (
              <Button 
                onClick={startGame}
                disabled={room.players.length < 2} // Should be 6 in real game
                className="w-full h-16 text-xl font-headline tracking-widest bg-accent hover:bg-accent/80 text-white shadow-lg accent-glow"
              >
                BEGIN THE INVESTIGATION
              </Button>
            )}
            {!me?.isHost && (
              <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground italic">
                Waiting for host to start the game...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (room.status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen mystery-gradient text-center p-8">
        <Skull className="h-16 w-16 text-accent animate-pulse mb-8" />
        <h2 className="text-4xl font-headline italic mb-4">{loadingMsg}</h2>
        <div className="w-64">
          <Progress value={45} className="h-1" />
        </div>
      </div>
    );
  }

  if (room.status === 'investigation' || room.status === 'accusation') {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-accent rounded-full flex items-center justify-center">
              <Fingerprint className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-headline italic">The {room.mystery?.victim.name} Murder</h1>
              <p className="text-muted-foreground text-sm flex items-center gap-2">
                <MapPin className="h-3 w-3" /> {room.mystery?.victim.locationOfDeath}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Badge variant="outline" className={room.status === 'investigation' ? "border-accent text-accent" : "border-destructive text-destructive"}>
               Phase: {room.status === 'investigation' ? "Investigation" : "Accusation"}
             </Badge>
             {me?.isHost && room.status === 'investigation' && (
               <Button onClick={moveToAccusation} size="sm" variant="destructive" className="font-headline tracking-tighter italic">
                 CALL THE VOTE
               </Button>
             )}
             {me?.isHost && room.status === 'accusation' && (
               <Button onClick={revealTruth} size="sm" className="bg-accent font-headline">
                 REVEAL THE TRUTH
               </Button>
             )}
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Sidebar: Character Details */}
          <aside className="lg:col-span-3 space-y-6">
            <Card className="bg-card/30 border-border/50">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase tracking-widest text-[10px] text-accent font-bold">Your Secret Identity</CardDescription>
                <CardTitle className="font-headline italic text-xl">{me?.character?.characterName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Background</p>
                  <p className="text-sm italic leading-relaxed">{me?.character?.backstory}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Relationships</p>
                  <p className="text-sm leading-relaxed">{me?.character?.relationships}</p>
                </div>
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mt-4">
                  <p className="text-xs text-destructive uppercase font-bold mb-1 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Hidden Secret
                  </p>
                  <p className="text-sm italic">{me?.character?.hiddenMotiveHint}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/20 border-border/30">
               <CardHeader className="py-3">
                 <CardTitle className="text-xs uppercase text-muted-foreground">Victim Profile</CardTitle>
               </CardHeader>
               <CardContent className="text-sm space-y-2">
                 <p><strong>Name:</strong> {room.mystery?.victim.name}</p>
                 <p><strong>Found:</strong> {room.mystery?.victim.locationOfDeath}</p>
                 <p><strong>Cause:</strong> {room.mystery?.victim.causeOfDeath}</p>
               </CardContent>
            </Card>
          </aside>

          {/* Main Content: Evidence & Interaction */}
          <main className="lg:col-span-6 space-y-6">
            <Tabs defaultValue="evidence" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/30">
                <TabsTrigger value="evidence" className="data-[state=active]:bg-accent/10">Evidence Board</TabsTrigger>
                <TabsTrigger value="interrogation" className="data-[state=active]:bg-accent/10">Interrogation</TabsTrigger>
              </TabsList>
              
              <TabsContent value="evidence" className="pt-4">
                <div className="grid grid-cols-1 gap-4">
                  {room.cluesDiscovered.map((clue, i) => (
                    <Card key={i} className="bg-card/50 border-border/30 border-l-4 border-l-accent overflow-hidden">
                      <CardContent className="p-4 flex gap-4">
                        <div className="h-10 w-10 shrink-0 bg-accent/10 flex items-center justify-center rounded">
                          <Fingerprint className="text-accent h-5 w-5" />
                        </div>
                        <div>
                           <p className="text-xs font-bold text-accent uppercase mb-1">Clue #{i+1}</p>
                           <p className="text-sm font-body italic">"{clue}"</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <div className="border-2 border-dashed border-border/30 rounded-lg p-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Search className="h-8 w-8 opacity-20" />
                    <p className="text-sm font-body italic">More clues remain hidden...</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="interrogation" className="pt-4 h-[500px] flex flex-col">
                <ScrollArea className="flex-1 border rounded-t-lg bg-background/30 p-4">
                   <div className="space-y-4">
                      <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg text-xs italic text-accent">
                        System: Real-time interrogation is active. Press the other suspects for their whereabouts at the time of the murder.
                      </div>
                      {chatLogs.map((log, i) => (
                        <div key={i} className={`flex flex-col ${log.from === playerName ? 'items-end' : 'items-start'}`}>
                           <span className="text-[10px] text-muted-foreground mb-1">{log.from}</span>
                           <div className={`p-3 rounded-lg text-sm max-w-[80%] ${log.from === playerName ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              {log.msg}
                           </div>
                        </div>
                      ))}
                   </div>
                </ScrollArea>
                <form onSubmit={handleInterrogation} className="flex gap-2 p-2 border border-t-0 rounded-b-lg bg-card/50">
                   <input 
                    value={interrogationText}
                    onChange={(e) => setInterrogationText(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 bg-transparent outline-none text-sm px-2"
                   />
                   <Button type="submit" size="sm" className="bg-accent hover:bg-accent/80">Ask</Button>
                </form>
              </TabsContent>
            </Tabs>

            {room.status === 'accusation' && (
              <Card className="border-destructive bg-destructive/5 shadow-2xl animate-in zoom-in-95 duration-300">
                <CardHeader>
                  <CardTitle className="text-destructive font-headline italic flex items-center gap-2">
                    <Gavel className="h-5 w-5" /> Final Accusation Phase
                  </CardTitle>
                  <CardDescription>Review the evidence one last time. Select who you believe is the killer.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {room.players.map(p => (
                      <Button 
                        key={p.id}
                        variant={me?.voteId === p.id ? 'default' : 'outline'}
                        className={`h-auto py-4 flex flex-col gap-1 items-start ${me?.voteId === p.id ? 'bg-destructive hover:bg-destructive/90' : 'border-destructive/20 hover:border-destructive/50'}`}
                        onClick={() => castVote(p.id)}
                      >
                        <span className="font-headline italic text-lg">{p.character?.characterName}</span>
                        <span className="text-[10px] opacity-70 uppercase tracking-tighter">Played by {p.name}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </main>

          {/* Right Sidebar: Suspects Alibis */}
          <aside className="lg:col-span-3 space-y-6">
             <Card className="bg-card/20 border-border/50">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-sm font-headline italic uppercase tracking-widest">
                   <Info className="h-4 w-4" /> The Suspects
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 {room.mystery?.suspects.map((suspect, i) => (
                   <div key={i} className="p-3 bg-background/40 border border-border/30 rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-headline italic text-sm">{suspect.name}</span>
                        {room.players.some(p => p.voteId === suspect.name) && <Vote className="h-3 w-3 text-destructive" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold italic">Alleged Alibi</p>
                      <p className="text-xs italic leading-tight opacity-80">"{suspect.alibi}"</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                         <Badge variant="secondary" className="text-[8px] bg-accent/10 text-accent">{suspect.relationshipToVictim}</Badge>
                      </div>
                   </div>
                 ))}
               </CardContent>
             </Card>
          </aside>
        </div>
      </div>
    );
  }

  if (room.status === 'revelation') {
    return (
      <div className="mystery-gradient min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-3xl w-full bg-card/80 backdrop-blur-xl border-accent/30 shadow-[0_0_50px_rgba(38,162,211,0.2)]">
          <CardHeader className="text-center border-b border-border/50 pb-8">
            <Badge className="bg-accent text-white mb-4">Case Closed</Badge>
            <CardTitle className="text-5xl font-headline italic tracking-tighter">The Final Reveal</CardTitle>
            <CardDescription className="font-body text-lg italic mt-2">Connecting the dots between the dinner and the crime.</CardDescription>
          </CardHeader>
          <CardContent className="p-10">
            <ScrollArea className="h-[400px] pr-6">
              <div className="space-y-6 text-lg font-body leading-relaxed whitespace-pre-line text-foreground/90 first-letter:text-5xl first-letter:font-headline first-letter:text-accent first-letter:mr-2 first-letter:float-left">
                {room.revelation}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t border-border/50 pt-8">
             <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-[0.2em]">The Killer was</p>
                <p className="text-3xl font-headline italic text-destructive">{room.mystery?.suspects.find(s => s.isKiller)?.name}</p>
             </div>
             <Button 
               onClick={() => window.location.href = '/'} 
               variant="outline"
               className="mt-6 border-accent text-accent hover:bg-accent hover:text-white"
             >
               Return to Main Menu
             </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return null;
}
