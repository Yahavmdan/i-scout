import { Team } from './team.model';
import { ScoringParameters } from './scoring-parameters.model';

export interface GameSettings {
  numTeams: number;
  numPlayersPerTeam: number;
  gameDuration: number;
  allowExtraTime: boolean;
  teams: Team[];
  scoring: ScoringParameters;
}
