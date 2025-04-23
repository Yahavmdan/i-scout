import {Component, OnDestroy, OnInit} from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms'; // Import ReactiveFormsModule
import {Subscription} from 'rxjs';
import {Router} from '@angular/router'; // Import Router
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';
import {CommonModule} from '@angular/common'; // Import CommonModule
import {Player, PlayerPosition} from '../models/player.model';
import {Team} from '../models/team.model';
import {ScoringParameterDefinition} from '../models/scoring-parameter-definition.model';
import {ScoringParameters} from '../models/scoring-parameters.model';
import {GameSettings} from '../models/game-settings.model';

@Component({
  selector: 'app-game-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule
  ],
  templateUrl: './game-settings.component.html',
  styleUrls: ['./game-settings.component.css'] // Use styleUrls with an array
})
export class GameSettingsComponent implements OnInit, OnDestroy {
  settingsForm!: FormGroup;
  private valueChangesSub: Subscription | undefined;
  private defaultTeamColors = ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Orange', 'Purple', 'Pink', 'Brown'];

  scoringParameters: ScoringParameterDefinition[] = [
    {key: 'goals', label: 'Goal'},
    {key: 'ownGoals', label: 'Own Goal'},
    {key: 'headGoals', label: 'Head Goal'},
    {key: 'goalAfterDribble', label: 'Goal After Dribble'},
    {key: 'hardGoal', label: 'Hard Goal'},
    {key: 'easyGoal', label: 'Easy Goal'},
    {key: 'farShootingGoal', label: 'Far Shooting Goal'},
    {key: 'passes', label: 'Pass'},
    {key: 'accuratePasses', label: 'Accurate Pass'},
    {key: 'passLeadingToGoal', label: 'Pass Leading To Goal'},
    {key: 'ballLoss', label: 'Ball Loss'},
    {key: 'ballLossDangerous', label: 'Ball Loss (Dangerous)'},
    {key: 'ballLossCausingGoal', label: 'Ball Loss Causing Goal'},
    {key: 'goalReceived', label: 'Goal Received (GK)'},
    {key: 'goalReceivedBadPass', label: 'Goal Received (Bad Pass GK)'},
    {key: 'goalReceivedOwnLoss', label: 'Goal Received (Own Loss GK)'},
    {key: 'tackle', label: 'Tackle'},
    {key: 'foul', label: 'Foul'},
    {key: 'violentFoul', label: 'Violent Foul'},
    {key: 'foulHandball', label: 'Foul (Handball)'},
    {key: 'foulStoppingGoalHand', label: 'Foul Stopping Goal (Hand)'},
    {key: 'foulStoppingGoalTackle', label: 'Foul Stopping Goal (Tackle)'},
    {key: 'penaltyScored', label: 'Penalty Scored'},
    {key: 'penaltyMissed', label: 'Penalty Missed'},
    {key: 'penaltySaved', label: 'Penalty Saved (GK)'},
  ];

  constructor(private fb: FormBuilder,
              private router: Router) { // Inject Router
  }

  ngOnInit(): void {
    this.initForm();
    this.loadGameSettings(); // Load saved settings or init defaults

    // Debounced saving of settings to local storage
    this.valueChangesSub = this.settingsForm.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => {
        this.saveSettingsToLocalStorage();
      });
  }

  ngOnDestroy(): void {
    this.valueChangesSub?.unsubscribe();
  }

  get numTeams(): number {
    return this.settingsForm.get('numTeams')?.value ?? 0;
  }

  get numPlayersPerTeam(): number {
    return this.settingsForm.get('numPlayersPerTeam')?.value ?? 0;
  }

  get players(): FormArray {
    return this.settingsForm?.get('players') as FormArray;
  }

  get teams(): FormArray {
    return this.settingsForm.get('teams') as FormArray;
  }

  // Dynamically builds the scoring controls based on scoringParameters definition
  private buildScoringControls(): { [key: string]: AbstractControl } {
    const controls: { [key: string]: AbstractControl } = {};

    this.scoringParameters.forEach(param => {
      // Initialize with null or a default value, will be patched later
      controls[param.key as keyof ScoringParameters] = this.fb.control(null, [Validators.required, Validators.min(-3), Validators.max(3)]);
    });
    return controls;
  }

  private getDefaultScoringValues(): ScoringParameters {
    const defaultScores: { [key: string]: number } = {
      goals: 1, ownGoals: -3, headGoals: 2, goalAfterDribble: 3, hardGoal: 3,
      easyGoal: 1, farShootingGoal: 3, passes: 0, accuratePasses: 1,
      passLeadingToGoal: 2, ballLoss: -1, ballLossDangerous: -2,
      ballLossCausingGoal: -3, goalReceived: -2, goalReceivedBadPass: -2,
      goalReceivedOwnLoss: -3, tackle: 1, foul: -1, violentFoul: -2, foulHandball: -1,
      foulStoppingGoalHand: -3, foulStoppingGoalTackle: -3, penaltyScored: 2,
      penaltyMissed: -2, penaltySaved: 3,
    };
    const values: { [key: string]: number } = {};
    // Iterate through defined keys to ensure all are present
    this.scoringParameters.forEach((param: ScoringParameterDefinition) => {
      values[param.key] = defaultScores[param.key] !== undefined ? defaultScores[param.key] : 0;
    });
    // Cast the result to ScoringParameters to satisfy the return type
    // Use double assertion via unknown for safer casting
    return values as unknown as ScoringParameters;
  }

  private updatePlayerListAndTeams(): void {
    const numTeams = this.settingsForm.get('numTeams')?.value ?? 0;
    const numPlayersPerTeam = this.settingsForm.get('numPlayersPerTeam')?.value ?? 0; // Renamed for clarity
    const totalPlayers = numTeams * numPlayersPerTeam; // Renamed for clarity

    if (numTeams <= 0 || numPlayersPerTeam <= 0 || totalPlayers <= 0) {
      this.players.clear();
      this.players.markAsUntouched();
      this.players.markAsPristine();
      this.teams.clear();
      this.teams.markAsUntouched();
      this.teams.markAsPristine();
      return;
    }

    const currentPlayers = this.players.length;

    if (totalPlayers > currentPlayers) {
      for (let i = currentPlayers; i < totalPlayers; i++) {
        const teamIndex = Math.floor(i / numPlayersPerTeam);
        const playerIndexInTeam = i % numPlayersPerTeam;
        this.players.push(this.createPlayerItem(teamIndex, playerIndexInTeam));
      }
    } else if (totalPlayers < currentPlayers) {
      // Remove excess players
      for (let i = currentPlayers - 1; i >= totalPlayers; i--) {
        this.players.removeAt(i);
      }
    }

    this.updateTeamNameControls(numTeams);
  }

  private updateTeamNameControls(numTeams: number): void {
    const teamsArray = this.teams;
    const currentLength = teamsArray.length;

    if (numTeams > teamsArray.length) {
      for (let i = teamsArray.length; i < numTeams; i++) {
        const defaultName = this.defaultTeamColors[i % this.defaultTeamColors.length] || `Team ${i + 1}`;
        teamsArray.push(this.fb.group({name: [defaultName, Validators.required]})); // Use color name
      }
    } else if (numTeams < teamsArray.length) {
      while (teamsArray.length > numTeams) {
        teamsArray.removeAt(teamsArray.length - 1);
      }
    }
  }

  private createTeamItem(teamIndex: number): FormGroup {
    return this.fb.group({
      name: [`Team ${teamIndex + 1}`, Validators.required]
    });
  }

  // Creates a FormGroup for a single player, potentially setting default name based on team
  private createPlayerItem(teamIndex: number, playerIndexInTeam: number): FormGroup {
    // Try to get team name from the form, otherwise use default
    const teamNameControl = this.teams.at(teamIndex)?.get('name');
    const teamName = teamNameControl?.value || this.defaultTeamColors[teamIndex % this.defaultTeamColors.length] || `Team ${teamIndex + 1}`;
    const playerName = `${teamName} - Player ${playerIndexInTeam + 1}`;
    return this.fb.group({
      name: [playerName, Validators.required],
      // Use the string literal value for the default position
      position: ['field_player' as PlayerPosition, Validators.required]
    });
  }

  onSubmit(): void {
    this.settingsForm.markAllAsTouched(); // Mark all fields for validation display
    if (this.settingsForm.valid) {
      // Explicitly type the raw form value (adjust based on actual structure)
      const currentSettings: {
        numTeams: number,
        numPlayersPerTeam: number,
        gameDuration: number,
        players: Player[],
        scoring: ScoringParameters,
        teams: { name: string }[]
      } = this.settingsForm.getRawValue();
      console.log('Form Submitted (Raw):', currentSettings);

      // Build settingsToSave explicitly matching GameSettings interface
      const settingsToSave: GameSettings = {
        numTeams: currentSettings.numTeams,
        numPlayersPerTeam: currentSettings.numPlayersPerTeam,
        gameDuration: currentSettings.gameDuration,
        scoring: currentSettings.scoring,
        teams: [] // This will be populated below
      };

      for (let i = 0; i < currentSettings.numTeams; i++) {
        const teamName = currentSettings.teams[i]?.name || this.defaultTeamColors[i % this.defaultTeamColors.length] || `Team ${i + 1}`; // Get name from form value
        const teamPlayers = currentSettings.players.slice(i * currentSettings.numPlayersPerTeam, (i + 1) * currentSettings.numPlayersPerTeam);
        settingsToSave.teams.push({name: teamName, players: teamPlayers}); // Include name
      }

      localStorage.setItem('iScoutGameSettings', JSON.stringify(settingsToSave));
      console.log('Settings saved to local storage with teams structure.');
      // Proceed with form data (e.g., navigate to game screen, store settings)
      void this.router.navigate(['/game']); // Navigate to game page
    } else {
      console.log('Form is invalid');
      // Optionally mark controls as touched to show validation errors
      this.settingsForm.markAllAsTouched();
    }
  }

  // Method to load default settings into the form
  loadDefaultSettings(): void {
    // 1. Define default values
    const defaultSettings = {
      numTeams: 3,
      numPlayersPerTeam: 4,
      gameDuration:7,
    };
    const defaultScoring = this.getDefaultScoringValues();

    // 2. Clear existing dynamic arrays BEFORE patching counts
    //    (updatePlayerListAndTeams will rebuild them based on new counts)
    this.teams.clear();
    this.players.clear();

    // 3. Patch the main form values (excluding arrays)
    this.settingsForm.patchValue({
      gameDuration: defaultSettings.gameDuration,
      numTeams: defaultSettings.numTeams,
      numPlayersPerTeam: defaultSettings.numPlayersPerTeam,
      scoring: defaultScoring,
      // Team and Player arrays are cleared, will be rebuilt by updatePlayerListAndTeams
    }, { emitEvent: false }); // Avoid triggering value changes during patch

    // 4. Explicitly update team/player arrays based on the new counts
    this.updateTeamNameControls(defaultSettings.numTeams);
    this.updatePlayerListAndTeams();

    // 5. Optional: Mark form as pristine and untouched
    this.settingsForm.markAsPristine();
    this.settingsForm.markAsUntouched();
  }

  // --- Helper Methods for Dynamic Form Arrays ---

  /**
   * Clears the saved game settings from local storage.
   */
  clearGameSettings(): void {
    localStorage.removeItem('iScoutGameSettings');
    // Optionally, provide user feedback (e.g., using a snackbar or alert)
    console.log('Saved game settings cleared.');
    // Maybe reset the form to defaults after clearing?
    // this.loadDefaultSettings();
  }

  /**
   * Clears the game history from local storage.
   */
  clearGameHistory(): void {
    localStorage.removeItem('gameHistory');
    // Optionally, provide user feedback
    console.log('Game history cleared.');
  }

  private initForm(): void {
    this.settingsForm = this.fb.group({
      numTeams: [2, [Validators.required, Validators.min(2), Validators.max(6)]],
      numPlayersPerTeam: [11, [Validators.required, Validators.min(1), Validators.max(11)]],
      gameDuration: [7, [Validators.required, Validators.min(1), Validators.max(90)]],
      scoring: this.fb.group(this.buildScoringControls()), // Build controls first
      teams: this.fb.array([]), // Initialize empty
      players: this.fb.array([]), // Initialize empty
    });

    // Patch default scoring values after controls are built
    this.settingsForm.get('scoring')?.patchValue(this.getDefaultScoringValues());

    // Populate initial teams/players based on default counts
    const initialNumTeams = this.settingsForm.get('numTeams')?.value || 2;
    const initialNumPlayers = this.settingsForm.get('numPlayersPerTeam')?.value || 11;
    this.updateTeamNameControls(initialNumTeams);
    this.updatePlayerListAndTeams();
  }

  private loadGameSettings(): void {
    // Try load saved settings
    const savedSettings = localStorage.getItem('iScoutGameSettings');
    if (savedSettings) {
      try {
        // Parse and cast to GameSettings for type safety, handle potential errors
        const parsedSettings = JSON.parse(savedSettings) as GameSettings;

        // Patch top-level controls first
        this.settingsForm.patchValue({
          numTeams: parsedSettings.numTeams,
          numPlayersPerTeam: parsedSettings.numPlayersPerTeam,
          gameDuration: parsedSettings.gameDuration,
          scoring: parsedSettings.scoring
        }, {emitEvent: false}); // Prevent triggering valueChanges during patch

        // Ensure team name controls match loaded counts FIRST
        this.updateTeamNameControls(parsedSettings.numTeams);
        // Patch team names from saved data
        const teamNames = parsedSettings.teams.map((team, index) => {
          const defaultName = this.defaultTeamColors[index % this.defaultTeamColors.length] || `Team ${index + 1}`;
          return {name: team.name || defaultName}; // Use default if saved name is missing
        });
        if (teamNames.length === this.teams.length) {
          this.teams.patchValue(teamNames, {emitEvent: false});
        }

        // Ensure player controls match loaded counts
        this.updatePlayerListAndTeams();

        // Ensure teams exists before flatMapping
        const flatPlayers: Player[] = parsedSettings.teams?.flatMap((team: Team) => team.players || []) || [];
        this.players.patchValue(flatPlayers, {emitEvent: false}); // patchValue expects data matching the control structure

      } catch (e) {
        console.error('Error parsing saved settings:', e);
        localStorage.removeItem('iScoutGameSettings'); // Clear invalid data
        this.updatePlayerListAndTeams(); // Populate with defaults if load failed
      }
    } else {
      // 3. Populate player list with defaults if no saved settings
      this.updatePlayerListAndTeams(); // Populate with defaults if no saved settings
    }
  }

  private saveSettingsToLocalStorage(): void {
    // Explicitly type the raw form value (adjust based on actual structure)
    const currentSettings: {
      numTeams: number,
      numPlayersPerTeam: number,
      gameDuration: number,
      players: Player[],
      scoring: ScoringParameters,
      teams: { name: string }[]
    } = this.settingsForm.getRawValue();

    // Use default color name if field is empty or just whitespace
    for (let i = 0; i < currentSettings.numTeams; i++) {
      const teamControl = this.teams.at(i).get('name');
      const defaultName = this.defaultTeamColors[i % this.defaultTeamColors.length] || `Team ${i + 1}`;
      const teamName = teamControl?.value?.trim() || defaultName;
      // Optionally patch the form value back if it was using the default
      if (!teamControl?.value?.trim()) {
        teamControl?.patchValue(defaultName, {emitEvent: false});
      }
      const teamPlayers = this.players.getRawValue().slice(i * currentSettings.numPlayersPerTeam, (i + 1) * currentSettings.numPlayersPerTeam);
      currentSettings.teams[i].name = teamName;
    }

    // Build settingsToSave explicitly matching GameSettings interface
    const settingsToSave: GameSettings = {
      numTeams: currentSettings.numTeams,
      numPlayersPerTeam: currentSettings.numPlayersPerTeam,
      gameDuration: currentSettings.gameDuration,
      scoring: currentSettings.scoring,
      teams: [] // This will be populated below
    };

    for (let i = 0; i < currentSettings.numTeams; i++) {
      const teamName = currentSettings.teams[i].name;
      const teamPlayers = currentSettings.players.slice(i * currentSettings.numPlayersPerTeam, (i + 1) * currentSettings.numPlayersPerTeam);
      settingsToSave.teams.push({name: teamName, players: teamPlayers}); // Include name
    }

    localStorage.setItem('iScoutGameSettings', JSON.stringify(settingsToSave));
    console.log('Settings saved to local storage with teams structure.');
  }
}
