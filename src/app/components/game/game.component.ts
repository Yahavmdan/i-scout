import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameSettings } from '../../models/game-settings.model';
import { FormatTimePipe } from '../../shared/pipes/format-time.pipe';
import { FormatActionNamePipe } from '../../shared/pipes/format-action-name.pipe';
import { Player } from '../../models/player.model';
import { Team } from '../../models/team.model';
import { GameRecord } from '../../models/game-record.model';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    CommonModule,
    FormatTimePipe,
    FormatActionNamePipe
  ],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit, OnDestroy {
  gameSettings: GameSettings | null = null;
  selectedTeamIndices: (number | null)[] = [-1, -1]; // Initialize with -1 for <option value="-1"> default

  // Timer properties
  maxTime: number = 0; // Initial time in seconds from settings
  timerValue: number = 0; // Current time in seconds
  timerInterval: any = null; // Holds the interval ID
  isTimerRunning: boolean = false;

  // Extra Time properties
  extraTimeRequested: boolean = false;
  isExtraTimeActive: boolean = false;
  isTimedPlayOver: boolean = false; // Renamed from isGameFinished
  isFinalResultDeclared: boolean = false; // New state for absolute end
  readonly EXTRA_TIME_DURATION = 120; // 2 minutes in seconds

  winnerTeamIndex: number | null = null; // Stores the index of the winning team

  // Score properties
  teamScores: number[] = [0, 0]; // Holds scores [Team1Score, Team2Score]

  // Player selection for scoring
  selectedPlayerTeamIndex: number | null = null; // Index within the original gameSettings.teams array
  selectedPlayerIndex: number | null = null;     // Index within the team's players array

  constructor() {}

  ngOnInit(): void {
    this.loadGameSettings();
  }

  private loadGameSettings(): void {
    const savedSettings = localStorage.getItem('iScoutGameSettings');
    if (savedSettings) {
      try {
        this.gameSettings = JSON.parse(savedSettings) as GameSettings;
        console.log('Game settings loaded:', this.gameSettings);
        // Initialize player scores if they don't exist
        this.gameSettings.teams?.forEach(team => {
          team.players?.forEach(player => {
            if (player.score === undefined) {
              player.score = 0;
            }
          });
        });

        // Initialize timer
        this.maxTime = (this.gameSettings.gameDuration || 60) * 60; // Convert minutes to seconds
        this.resetTimer(); // Set initial timer value
      } catch (e) {
        console.error('Error parsing game settings from localStorage:', e);
        // TODO: Handle missing/invalid settings (e.g., redirect back to settings)
        this.resetTimer(); // Set default if settings fail
      }
    } else {
      console.warn('No game settings found in localStorage.');
      // TODO: Handle missing settings (e.g., redirect back to settings)
      this.resetTimer(); // Set default if settings fail
    }
  }

  // Handles changes in the team selection dropdowns
  onTeamSelect(selectorIndex: 0 | 1, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const teamIndex = parseInt(selectElement.value, 10);

    if (!isNaN(teamIndex)) {
      this.selectedTeamIndices[selectorIndex] = teamIndex;
      console.log(`Selected teams (indices):`, this.selectedTeamIndices);

      // TODO: Add validation to ensure teams are different
      // TODO: Potentially disable the selected option in the other dropdown
      this.resetScores();
    } else {
      // Handle case where selection is cleared (e.g., back to "-- Select Team --")
      this.selectedTeamIndices[selectorIndex] = null;
    }
  }

  // --- Timer Controls ---
  startTimer(): void {
    if (this.isTimerRunning || this.timerValue <= 0 || this.isTimedPlayOver) return; // Prevent starting timer if timed play is over

    this.isTimerRunning = true;
    this.extraTimeRequested = false; // Hide prompt if starting manually

    this.timerInterval = setInterval(() => {
      if (this.timerValue > 0) {
        this.timerValue--;
      }

      if (this.timerValue <= 0) {
        this.handleTimerEnd();
      }
    }, 1000);
  }

  handleTimerEnd(): void {
    this.stopTimer(); // Stop the interval first

    if (!this.isExtraTimeActive && !this.extraTimeRequested && !this.isTimedPlayOver) {
      // Main time finished, request extra time
      this.extraTimeRequested = true;
      console.log('Main time finished. Requesting extra time.');
    } else if (this.isExtraTimeActive) {
      // Extra time finished
      this.isExtraTimeActive = false; // No longer in extra time mode
      this.isTimedPlayOver = true; // Timed play is over
      console.log('Extra time finished. Timed play over.');
    }
    // If extraTimeRequested is true, do nothing - wait for user input
    // If isTimedPlayOver is true, do nothing
  }

  pauseTimer(): void {
    if (!this.isTimerRunning) return;

    clearInterval(this.timerInterval);
    this.isTimerRunning = false;
  }

  resetTimer(): void {
    this.stopTimer();
    this.timerValue = this.maxTime; // Reset to full duration from settings
    this.isTimerRunning = false;
    this.extraTimeRequested = false;
    this.isExtraTimeActive = false;
    this.isTimedPlayOver = false; // Reset timed play flag
    this.isFinalResultDeclared = false; // Reset final result flag
    this.winnerTeamIndex = null; // Reset winner

    // Reset team selections
    this.selectedTeamIndices = [-1, -1];

    // Reset team scores
    this.teamScores = [0, 0];

    // Reset player selection
    this.resetPlayerSelection();

    // Reset individual player scores within the loaded gameSettings
    if (this.gameSettings && this.gameSettings.teams) {
      this.gameSettings.teams.forEach(team => {
        if (team.players) {
          team.players.forEach(player => {
            player.score = 0; // Reset score to 0
          });
        }
      });
    }

    console.log('Timer reset');
  }

  addExtraTime(): void {
    if (this.isTimedPlayOver || this.isExtraTimeActive) return; // Don't add if timed play over or active

    console.log('Adding extra time');
    this.timerValue = this.EXTRA_TIME_DURATION;
    this.isExtraTimeActive = true;
    this.extraTimeRequested = false; // Hide the prompt
    this.startTimer(); // Start the timer with the extra time
  }

  endGameWithoutExtraTime(): void {
    console.log('Ending game without extra time.');
    this.extraTimeRequested = false; // Hide prompt
    this.isTimedPlayOver = true; // Timed play is over
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isTimerRunning = false;
  }

  endTimedPlayManually(): void {
    if (!this.isTimerRunning) {
      console.warn('Cannot end manually: Timer is not running.');
      return;
    }
    console.log('Manually ending timed play.');
    this.stopTimer();
    this.isTimedPlayOver = true;
    this.isExtraTimeActive = false; // Ensure extra time flags are cleared
    this.extraTimeRequested = false;
    // Now the UI should show the 'Declare Winner' section
  }

  ngOnDestroy(): void {
    this.stopTimer(); // Ensure timer is stopped when component is destroyed
  }

  // --- Scoring Logic ---
  // Getter for easy access to scoring parameters as an array
  get scoringParametersArray(): { name: string, points: number }[] {
    if (!this.gameSettings?.scoring) {
      return [];
    }
    return Object.entries(this.gameSettings.scoring).map(([name, points]) => ({ name, points }));
  }

  // Getter for the currently selected player object (handles safety checks)
  get selectedPlayer(): Player | null {
    if (this.selectedPlayerTeamIndex === null || this.selectedPlayerIndex === null) {
      return null;
    }
    const team = this.gameSettings?.teams?.[this.selectedPlayerTeamIndex];
    const player = team?.players?.[this.selectedPlayerIndex];
    return player || null; // Return the player or null if not found
  }

  selectPlayer(teamIndex: number, playerIndex: number): void {
    if (this.isFinalResultDeclared) { // Allow selection even if timer stopped, unless game fully over
      console.warn('Timer must be running to select a player.');
      return; // Prevent selection if timer is not running
    }

    this.selectedPlayerTeamIndex = teamIndex;
    this.selectedPlayerIndex = playerIndex;
    console.log(`Selected player: Team ${teamIndex + 1}, Player ${playerIndex + 1}`);
  }

  applyScoreAction(actionName: string, points: number): void {
    if (this.isFinalResultDeclared) { // Prevent scoring only if final result is declared
      console.warn('Timer must be running to apply score actions.');
      return; // Prevent scoring if timer not running
    }

    // Add explicit checks for null indices *before* using them
    if (typeof this.selectedPlayerTeamIndex !== 'number' || typeof this.selectedPlayerIndex !== 'number') {
      console.warn('No player selected to apply score.');
      return;
    }

    // Ensure gameSettings and the player object exist
    const team = this.gameSettings?.teams?.[this.selectedPlayerTeamIndex];

    // Check if team and player exist before proceeding
    if (team && team.players) {
      const player = team.players[this.selectedPlayerIndex];
      if (player) {
        player.score = (player.score || 0) + points;
        console.log(`Applied action '${actionName}' (${points} pts) to Player ${this.selectedPlayerIndex + 1} on Team ${this.selectedPlayerTeamIndex + 1}. New score: ${player.score}`);

        // Optional: Deselect player after applying score?
        // this.resetPlayerSelection(); // Deselect after scoring
      } else {
        console.error(`Player index ${this.selectedPlayerIndex} out of bounds for team ${this.selectedPlayerTeamIndex}.`);
      }
    } else {
      console.error(`Team index ${this.selectedPlayerTeamIndex} not found or has no players.`);
    }
  }

  incrementScore(teamSelectorIndex: 0 | 1): void {
    if (this.isFinalResultDeclared) { // Prevent scoring only if final result is declared
      console.warn('Timer must be running to increment team score.');
      return; // Prevent scoring if timer not running
    }

    // Make sure a team is actually selected for this selector
    const teamDataIndex = this.selectedTeamIndices[teamSelectorIndex];
    if (teamDataIndex !== null && teamDataIndex !== -1) {
      // Increment the score based on the selector index (0 or 1)
      this.teamScores[teamSelectorIndex]++;
      console.log(`Score updated: Team ${teamSelectorIndex + 1} = ${this.teamScores[teamSelectorIndex]}`);
    }
  }

  decrementScore(teamSelectorIndex: 0 | 1): void {
    if (this.isFinalResultDeclared) { // Prevent scoring only if final result is declared
      console.warn('Timer must be running to decrement team score.');
      return; // Prevent scoring if timer not running
    }

    // Decrement score, ensuring it doesn't go below 0
    this.teamScores[teamSelectorIndex] = Math.max(0, this.teamScores[teamSelectorIndex] - 1);

    console.log(`Decremented score for Team Index ${teamSelectorIndex}. New score: ${this.teamScores[teamSelectorIndex]}`);
  }

  resetScores(): void {
    this.teamScores = [0, 0];
    console.log('Scores reset');
  }

  // --- Winner Declaration and Saving ---
  declareWinner(winningTeamOriginalIndex: number): void {
    if (!this.isTimedPlayOver || this.isFinalResultDeclared) {
      console.warn('Cannot declare winner at this stage.');
      return;
    }
    console.log(`Declaring winner: Team index ${winningTeamOriginalIndex}`);
    this.winnerTeamIndex = winningTeamOriginalIndex;
    this.isFinalResultDeclared = true; // Set final flag
    this.saveFinalGameData(); // Save the result
  }

  saveFinalGameData(): void {
    if (!this.gameSettings || this.selectedTeamIndices[0] === null || this.selectedTeamIndices[1] === null || this.winnerTeamIndex === null) {
      console.error('Cannot save game data: Missing required information (settings, teams, or winner).');
      return;
    }

    const gameId = `game_${Date.now()}`;
    const startTime = Date.now() - ((this.maxTime + (this.isExtraTimeActive || this.extraTimeRequested ? this.EXTRA_TIME_DURATION : 0)) - this.timerValue) * 1000; // Rough estimate

    const team1Index = this.selectedTeamIndices[0];
    const team2Index = this.selectedTeamIndices[1];

    const finalRecord: GameRecord = {
      gameId: gameId,
      startTime: startTime,
      endTime: Date.now(),
      team1: { index: team1Index, name: this.gameSettings.teams[team1Index].name ?? `Team ${team1Index + 1}`, score: this.teamScores[0], players: this.gameSettings.teams[team1Index].players ?? [] },
      team2: { index: team2Index, name: this.gameSettings.teams[team2Index].name ?? `Team ${team2Index + 1}`, score: this.teamScores[1], players: this.gameSettings.teams[team2Index].players ?? [] },
      winnerTeamIndex: this.winnerTeamIndex,
      extraTimePlayed: this.isExtraTimeActive || (this.isTimedPlayOver && !this.extraTimeRequested) // True if extra time ran or finished
    };

    // Retrieve existing history or initialize
    const historyString = localStorage.getItem('gameHistory');
    const history: GameRecord[] = historyString ? JSON.parse(historyString) : [];

    // Add current game and save
    history.push(finalRecord);
    localStorage.setItem('gameHistory', JSON.stringify(history));

    console.log('Game data saved to local storage:', finalRecord);
    console.log('Total games in history:', history.length);
  }

  // --- Scoring Logic / Helpers ---
  // --- Helper methods for template safety ---
  getSelectedTeam(selectorIndex: 0 | 1): Team | null {
    const teamDataIndex = this.selectedTeamIndices[selectorIndex];
    if (teamDataIndex === null || teamDataIndex === -1) {
      return null;
    }
    return this.gameSettings?.teams?.[teamDataIndex] || null;
  }

  getPlayersForSelectedTeam(selectorIndex: 0 | 1): Player[] {
    const team = this.getSelectedTeam(selectorIndex);
    return team?.players || []; // Return players array or empty array

  }

  resetPlayerSelection(): void {
    this.selectedPlayerTeamIndex = null;
    this.selectedPlayerIndex = null;
  }
}
