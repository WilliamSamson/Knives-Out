import { GeneratePlayerCharacterOutput } from '@/ai/flows/generate-player-character';
import { GenerateMurderMysteryOutput } from '@/ai/flows/generate-murder-mystery';

export type GameStatus = 'lobby' | 'generating' | 'investigation' | 'accusation' | 'revelation';

export type Player = {
  id: string;
  name: string;
  character?: GeneratePlayerCharacterOutput;
  isHost: boolean;
  ready: boolean;
  voteId?: string;
};

export type GameRoom = {
  id: string;
  status: GameStatus;
  players: Player[];
  mystery?: GenerateMurderMysteryOutput;
  cluesDiscovered: string[];
  revelation?: string;
};

export const INITIAL_ROOM_ID = 'mansion-hall';

export function createInitialRoom(roomId: string): GameRoom {
  return {
    id: roomId,
    status: 'lobby',
    players: [],
    cluesDiscovered: [],
  };
}