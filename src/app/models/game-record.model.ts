import { Player } from './player.model';

// Interface for storing game results in localStorage
export interface GameRecord {
  gameId: string; // Unique ID for the game (e.g., timestamp)
  startTime: number; // Unix timestamp (ms)
  endTime: number; // Unix timestamp (ms)
  team1: { index: number; name: string; score: number; players: Player[] };
  team2: { index: number; name: string; score: number; players: Player[] };
  winnerTeamIndex: number | null; // Original index from GameSettings.teams
  extraTimePlayed: boolean;
}
