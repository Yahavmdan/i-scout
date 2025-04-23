import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameRecord } from '../models/game-record.model';
import { Player } from '../models/player.model';

interface DailyStats {
  date: string; // Formatted date string (e.g., 'YYYY-MM-DD')
  games: GameRecord[];
  totalGames: number;
  teamWins: { [teamName: string]: number };
  mostSuccessfulTeam: { name: string; wins: number } | null;
  playerScores: { [playerName: string]: { score: number; gamesPlayed: number } }; // Aggregate score and games played
  sortedPlayerScores: { name: string; score: number; gamesPlayed: number; performanceScore: number; wins: number; losses: number }[]; // For easy display
}

@Component({
  selector: 'app-stats-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-history.component.html',
  styleUrls: ['./stats-history.component.css']
})
export class StatsHistoryComponent implements OnInit {
  dailyStats: DailyStats[] = [];
  isLoading: boolean = true;
  errorLoading: boolean = false;
  totalTeamWins: { [teamName: string]: number } = {};
  sortedTotalTeamWins: { name: string; wins: number }[] = [];

  constructor() {}

  ngOnInit(): void {
    this.loadAndProcessHistory();
  }

  private loadAndProcessHistory(): void {
    this.isLoading = true;
    this.errorLoading = false;
    try {
      const historyString = localStorage.getItem('gameHistory');
      const history: GameRecord[] = historyString ? JSON.parse(historyString) : [];

      if (history.length === 0) {
        this.isLoading = false;
        return; // No history to process
      }

      // Calculate Total Wins Across All Games FIRST
      this.totalTeamWins = {}; // Reset before calculation
      history.forEach(game => {
        if (game.winnerTeamIndex !== null) {
          // Determine the winning team based on index using team1/team2
          let winningTeam: { name: string } | null = null;
          if (game.winnerTeamIndex === game.team1.index) {
            winningTeam = game.team1;
          } else if (game.winnerTeamIndex === game.team2.index) {
            winningTeam = game.team2;
          }
          if (winningTeam) {
            const teamName = winningTeam.name;
            this.totalTeamWins[teamName] = (this.totalTeamWins[teamName] || 0) + 1;
          }
        }
      });

      // Sort total wins for display
      this.sortedTotalTeamWins = Object.entries(this.totalTeamWins)
        .map(([name, wins]) => ({ name, wins }))
        .sort((a, b) => b.wins - a.wins); // Sort descending by wins

      // 1. Group games by date (using endTime)
      const groupedByDate: { [date: string]: GameRecord[] } = history.reduce((acc, game) => {
        // Get date string in YYYY-MM-DD format, considering local timezone
        const gameDate = new Date(game.endTime);
        const dateString = gameDate.toLocaleDateString('sv'); // 'sv' gives YYYY-MM-DD format

        if (!acc[dateString]) {
          acc[dateString] = [];
        }
        acc[dateString].push(game);
        return acc;
      }, {} as { [date: string]: GameRecord[] });

      // 2. Process each group into DailyStats
      const processedStats: DailyStats[] = Object.entries(groupedByDate).map(([date, games]) => {
        const teamWins: { [teamName: string]: number } = {};
        const playerScores: { [playerName: string]: { score: number; gamesPlayed: number } } = {};
        const playerTeamWins: { [playerName: string]: number } = {}; // Track wins for players' teams

        games.forEach(game => {
          // Tally winner & track player wins
          if (game.winnerTeamIndex !== null) {
            let winningTeam: { name: string; players: Player[] } | null = null;
            let winningTeamPlayers: Player[] = [];

            if (game.winnerTeamIndex === game.team1.index) {
              winningTeam = game.team1;
            } else if (game.winnerTeamIndex === game.team2.index) {
              winningTeam = game.team2;
            }

            if (winningTeam) {
              const teamName = winningTeam.name;
              teamWins[teamName] = (teamWins[teamName] || 0) + 1;
              // Track that players on the winning team got a win
              winningTeam.players.forEach(p => {
                playerTeamWins[p.name] = (playerTeamWins[p.name] || 0) + 1;
              });
            }
          }

          // Aggregate player scores from both teams
          const processTeamPlayers = (team: { name: string; players: Player[] }) => {
            team.players.forEach(player => {
              if (!playerScores[player.name]) {
                playerScores[player.name] = { score: 0, gamesPlayed: 0 };
              }
              playerScores[player.name].score += (player.score || 0);
              playerScores[player.name].gamesPlayed += 1;
            });
          };
          processTeamPlayers(game.team1);
          processTeamPlayers(game.team2);
        });

        // Find winningest team
        let winningestTeam: { name: string; wins: number } | null = null;
        let maxWins = 0;
        for (const [name, wins] of Object.entries(teamWins)) {
          if (wins > maxWins) {
            maxWins = wins;
            winningestTeam = { name, wins };
          } else if (wins === maxWins && winningestTeam) {
             // Handle ties - could show multiple or label as 'Tie'
             winningestTeam.name += ` & ${name}`; // Simple tie handling
          }
        }

        // Sort players by score (descending) & calculate performance score
        // Find min/max scores for normalization (within this day)
        let minDailyScore = Infinity;
        let maxDailyScore = -Infinity;
        const rawScores = Object.values(playerScores).map(p => p.score);
        if (rawScores.length > 0) {
          minDailyScore = Math.min(...rawScores);
          maxDailyScore = Math.max(...rawScores);
        } else {
          minDailyScore = 0; // Default if no players
          maxDailyScore = 0;
        }

        const sortedPlayerScores = Object.entries(playerScores)
          .map(([name, data]) => {
            const rawScore = data.score;
            const scoreRange = maxDailyScore - minDailyScore;

            // Normalize score to 1-8 range
            let normalizedScore = 4.5; // Default middle score if range is 0 or no players
            if (scoreRange > 0) {
              normalizedScore = 1 + 7 * ((rawScore - minDailyScore) / scoreRange);
            }

            // Add bonus for being on a winning team
            const wins = playerTeamWins[name] || 0;
            const winBonus = wins > 0 ? 2 : 0; // Bonus of 2 if player had at least one win

            // Combine, round, and clamp to 1-10
            const performanceScore = Math.round(Math.min(10, Math.max(1, normalizedScore + winBonus)));

            // Calculate losses
            const losses = data.gamesPlayed - wins;

            return {
              name,
              score: data.score, // Keep raw score
              gamesPlayed: data.gamesPlayed,
              performanceScore, // Add calculated performance score
              wins,
              losses
            };
          })
           .sort((a, b) => b.performanceScore - a.performanceScore); // Sort by Performance Score DESC

        return {
          date,
          games,
          totalGames: games.length,
          teamWins,
          mostSuccessfulTeam: winningestTeam,
          playerScores,
          sortedPlayerScores
        };
      });

      // Sort days by date (most recent first)
      this.dailyStats = processedStats.sort((a, b) => b.date.localeCompare(a.date));
      this.isLoading = false;

    } catch (error) {
      console.error("Error loading or processing game history:", error);
      this.errorLoading = true;
      this.isLoading = false;
    }
  }
}
