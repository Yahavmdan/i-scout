export type PlayerPosition = 'goalkeeper' | 'field_player';

export interface Player {
  name: string;
  position: PlayerPosition;
  score: number;
}
