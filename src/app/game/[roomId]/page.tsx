'use client';

import { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { GameRoom, Player, GameStatus } from '@/app/lib/game-state';
import { generateMurderMystery } from '@/ai/flows/generate-murder-mystery';
import { revealMurderResolution } from '@/ai/flows/reveal-murder-resolution';
import { interrogateSuspect } from '@/ai/flows/interrogate-suspect';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Info, MapPin, Skull, Fingerprint, ShieldAlert, Vote, Gavel, Search, MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function GameRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const unwrappedParams = use(params);
  const roomId = unwrappedParams.roomId;
  const searchParams = useSearchParams();
  const playerName = searchParams.get('name') || 'Anonymous';
  const isHostParam = searchParams.get('host') === 'true';
  const { toast } = useToast();

  const [room, setRoom] = useState<GameRoom>({
    id: roomId,
    status: 'lobby',
    players: [],
    cluesDiscovered: [],
  });
  
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [interrogationText, setInterrogationText] = useState('');
  const [selectedSuspect, setSelectedSuspect] = useState<string>('');
  const [chatLogs, setChatLogs] = useState<{from: string, msg: string, isSuspect?: boolean}[]>([]);
  const [isInterrogating, setIsInterrogating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    setLocalPlayerId(Math.random().toString(36).substring(7));
  }, []);

  useEffect(() => {
    if (!localPlayerId) return;

    const me: Player = {
      id: localPlayerId,
      name: playerName,
      isHost: isHostParam,
      ready: false,
    };
    
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
    if (isStarting) return;
    setIsStarting(true);
    setRoom(prev => ({ ...prev, status: 'generating' }));
    setLoadingMsg('Generating the perfect crime...');

    try {
      const mystery = await generateMurderMystery({ setting: 'A secluded winter manor in the mountains.' });
      
      setLoadingMsg('Assigning roles and secrets...');

      const updatedPlayers = room.players.map((p, i) => {
        const suspect = mystery.suspects[i] || mystery.suspects[0];
        return {
          ...p,
          character: {
            characterName: suspect.name,
            backstory: `${suspect.backstorySummary} Your alibi: ${suspect.alibi}`,
            relationships: suspect.relationshipToVictim,
            hiddenMotiveHint: suspect.isKiller ? `YOU ARE THE KILLER. ${suspect.hiddenMotive}` : suspect.hiddenMotive
          }
        };
      });

      setRoom(prev => ({
        ...prev,
        status: 'investigation',
        players: updatedPlayers,
        mystery: mystery,
        cluesDiscovered: mystery.clues.slice(0, 2)
      }));
      
      if (mystery.suspects.length > 0) {
        setSelectedSuspect(mystery.suspects[0].name);
      }
    } catch (e: any) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Mystery Generation Failed",
        description: e.message.includes('429') 
          ? "The AI is currently exhausted. Please wait a minute and try again." 
          : "Something went wrong while setting the scene.",
      });
      setRoom(prev => ({ ...prev, status: 'lobby' }));
    } finally {
      setIsStarting(false);
    }
  };

  const handleInterrogation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interrogationText || !selectedSuspect || !room.mystery || isInterrogating) return;

    const question = interrogationText;
    setInterrogationText('');
    setChatLogs(prev => [...prev, { from: playerName, msg: question }]);
    setIsInterrogating(true);

    try {
      const response = await interrogateSuspect({
        mysteryScenario: room.mystery,
        suspectName: selectedSuspect,
        question: question,
        previousConversation: chatLogs.slice(-4).map(l => ({
          role: l.isSuspect ? 'assistant' : 'user',
          content: l.msg
        }))
      });

      setChatLogs(prev => [...prev, { from: selectedSuspect, msg: response.response, isSuspect: true }]);
    } catch (e: any) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Interrogation Interrupted",
        description: e.message.includes('429') 
          ? "The suspect is overwhelmed. Give them a moment." 
          : "The connection to the suspect was lost.",
      });
      setChatLogs(prev => [...prev, { from: 'System', msg: 'The suspect remains silent...' }]);
    } finally {
      setIsInterrogating(false);
    }
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
    if (!room.mystery || isStarting) return;
    setIsStarting(true);
    setRoom(prev => ({ ...prev, status: 'generating' }));
    setLoadingMsg('Connecting the clues...');

    try {
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
    } catch (e: any) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Revelation Failed",
        description: "The truth is still shrouded in mystery. Try revealing again.",
      });
      setRoom(prev => ({ ...prev, status: 'investigation' }));
    } finally {
      setIsStarting(false);
    }
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
                disabled={room.players.length < 1 || isStarting}
                className="w-full h-16 text-xl font-headline tracking-widest bg-accent hover:bg-accent/80 text-white shadow-lg accent-glow"
              >
                BEGIN THE INVESTIGATION
              </Button>
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
        <div className="w-64 mx-auto">
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
               <Button onClick={revealTruth} size="sm" className="bg-accent font-headline" disabled={isStarting}>
                 REVEAL THE TRUTH
               </Button>
             )}
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-6">
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
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mt-4">
                  <p className="text-xs text-destructive uppercase font-bold mb-1 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Hidden Secret
                  </p>
                  <p className="text-sm italic">{me?.character?.hiddenMotiveHint}</p>
                </div>
              </CardContent>
            </Card>
          </aside>

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
                </div>
              </TabsContent>

              <TabsContent value="interrogation" className="pt-4 h-[600px] flex flex-col gap-4">
                <div className="flex gap-2">
                  <Select value={selectedSuspect} onValueChange={setSelectedSuspect}>
                    <SelectTrigger className="bg-card/50">
                      <SelectValue placeholder="Select a suspect" />
                    </SelectTrigger>
                    <SelectContent>
                      {room.mystery?.suspects.map(s => (
                        <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="flex-1 border rounded-lg bg-background/30 p-4">
                   <div className="space-y-4">
                      {chatLogs.length === 0 && (
                        <div className="text-center py-10 opacity-50 italic text-sm">
                          Select a suspect above and begin your questioning...
                        </div>
                      )}
                      {chatLogs.map((log, i) => (
                        <div key={i} className={`flex flex-col ${!log.isSuspect ? 'items-end' : 'items-start'}`}>
                           <span className="text-[10px] text-muted-foreground mb-1">{log.from}</span>
                           <div className={`p-3 rounded-lg text-sm max-w-[85%] ${!log.isSuspect ? 'bg-primary text-primary-foreground' : 'bg-muted border border-accent/20'}`}>
                              {log.msg}
                           </div>
                        </div>
                      ))}
                      {isInterrogating && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                          <MessageSquare className="h-3 w-3" /> {selectedSuspect} is thinking...
                        </div>
                      )}
                   </div>
                </ScrollArea>
                
                <form onSubmit={handleInterrogation} className="flex gap-2 p-2 border rounded-lg bg-card/50">
                   <input 
                    value={interrogationText}
                    onChange={(e) => setInterrogationText(e.target.value)}
                    placeholder={selectedSuspect ? `Ask ${selectedSuspect} a question...` : "Select a suspect first..."}
                    className="flex-1 bg-transparent outline-none text-sm px-2"
                    disabled={!selectedSuspect || isInterrogating}
                   />
                   <Button type="submit" size="sm" className="bg-accent hover:bg-accent/80" disabled={!selectedSuspect || isInterrogating}>
                     Ask
                   </Button>
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
                    {room.mystery?.suspects.map(suspect => (
                      <Button 
                        key={suspect.name}
                        variant={me?.voteId === suspect.name ? 'default' : 'outline'}
                        className={`h-auto py-4 flex flex-col gap-1 items-start ${me?.voteId === suspect.name ? 'bg-destructive hover:bg-destructive/90' : 'border-destructive/20 hover:border-destructive/50'}`}
                        onClick={() => castVote(suspect.name)}
                      >
                        <span className="font-headline italic text-lg">{suspect.name}</span>
                        <span className="text-[10px] opacity-70 uppercase tracking-tighter">{suspect.relationshipToVictim}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </main>

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
                        {me?.voteId === suspect.name && <Vote className="h-3 w-3 text-destructive" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold italic">Alleged Alibi</p>
                      <p className="text-xs italic leading-tight opacity-80">"{suspect.alibi}"</p>
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
