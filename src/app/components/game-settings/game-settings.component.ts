import {Component, OnDestroy, OnInit} from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators} from '@angular/forms'; // Import ReactiveFormsModule
import {Subscription} from 'rxjs';
import {Router} from '@angular/router'; // Import Router
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';
import {CommonModule} from '@angular/common'; // Import CommonModule
import {FormsModule} from '@angular/forms'; // Import FormsModule
import {Player, PlayerPosition} from '../../models/player.model';
import {Team} from '../../models/team.model';
import {ScoringParameterDefinition} from '../../models/scoring-parameter-definition.model';
import {ScoringParameters} from '../../models/scoring-parameters.model';
import {GameSettings} from '../../models/game-settings.model';

@Component({
  selector: 'app-game-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    FormsModule // Add FormsModule for ngModel
  ],
  templateUrl: './game-settings.component.html',
  styleUrls: ['./game-settings.component.css'] // Use styleUrls with an array
})
export class GameSettingsComponent implements OnInit, OnDestroy {
  settingsForm!: FormGroup;
  private valueChangesSub: Subscription | undefined;
  private defaultTeamColors = ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Orange', 'Purple', 'Pink', 'Brown'];

  // Confirmation state
  confirmingDeleteSettings = false;
  confirmingDeleteHistory = false;
  deleteConfirmationControl = new FormControl(''); // New control for confirmation input
  readonly CONFIRMATION_PHRASE = 'delete this';

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
        teams: { name: string }[],
        allowExtraTime: boolean // Add this property
      } = this.settingsForm.getRawValue();
      console.log('Form Submitted (Raw):', currentSettings);

      // Build settingsToSave explicitly matching GameSettings interface
      const settingsToSave: GameSettings = {
        numTeams: currentSettings.numTeams,
        numPlayersPerTeam: currentSettings.numPlayersPerTeam,
        gameDuration: currentSettings.gameDuration,
        scoring: currentSettings.scoring,
        teams: [],
        allowExtraTime: currentSettings.allowExtraTime // Get value from form
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
      allowExtraTime: false // Default to false
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
      allowExtraTime: defaultSettings.allowExtraTime, // Patch allowExtraTime
      // Team and Player arrays are cleared, will be rebuilt by updatePlayerListAndTeams
    }, { emitEvent: false }); // Avoid triggering valueChanges during patch

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
  requestClearSettings(): void {
    this.cancelDelete(); // Ensure only one confirmation is active
    this.confirmingDeleteSettings = true;
  }

  /**
   * Clears the game history from local storage.
   */
  requestClearHistory(): void {
    this.cancelDelete(); // Ensure only one confirmation is active
    this.confirmingDeleteHistory = true;
  }

  confirmDelete(type: 'settings' | 'history'): void {
    console.log(`Confirming delete for: ${type}`);
    const inputValue = this.deleteConfirmationControl.value || ''; // Get value from FormControl
    console.log(`Input value: '${inputValue}'`);
    console.log(`Lowercase input: '${inputValue.toLowerCase()}'`);
    console.log(`Expected phrase: '${this.CONFIRMATION_PHRASE}'`);
    console.log(`Comparison result: ${inputValue.toLowerCase() === this.CONFIRMATION_PHRASE}`);
    if (inputValue.toLowerCase() === this.CONFIRMATION_PHRASE) {
      if (type === 'settings') {
        this.performClearSettings();
      } else if (type === 'history') {
        this.performClearHistory();
      }
      this.cancelDelete(); // Reset state after successful delete
    } else {
      // Optional: Add feedback if the input is wrong
      alert('Confirmation text does not match. Please type "delete this".');
      this.deleteConfirmationControl.setValue(''); // Reset the FormControl
    }
  }

  cancelDelete(): void {
    this.confirmingDeleteSettings = false;
    this.confirmingDeleteHistory = false;
    this.deleteConfirmationControl.setValue(''); // Reset the FormControl
  }

  // --- Actual Local Storage Clearing ---

  private performClearSettings(): void {
    console.log('Attempting to clear saved settings...');
    try {
      localStorage.removeItem('iScoutGameSettings');
      console.log('Saved settings cleared from local storage.');
      // Reload the component or reset the form to defaults after clearing
      // Option 1: Reload (simple but full page refresh)
      // window.location.reload();
      // Option 2: Reset form to initial/default state
      // this.settingsForm.reset(); // Reset form state
      this.loadDefaultSettings(); // Reload defaults explicitly
      alert('Saved game settings have been cleared.');
    } catch (e) {
      console.error('Error clearing saved settings from local storage:', e);
      alert('Failed to clear saved settings.');
    }
  }

  private performClearHistory(): void {
    console.log('Attempting to clear game history...');
    try {
      localStorage.removeItem('gameHistory'); // Correct key: gameHistory
      console.log('Game history cleared from local storage.');
      alert('Game history has been cleared.');
    } catch (e) {
      console.error('Error clearing game history from local storage:', e);
      alert('Failed to clear game history.');
    }
  }

  private initForm(): void {
    // Define default values (matching loadDefaultSettings)
    const defaultNumTeams = 3; // Updated to match loadDefaultSettings
    const defaultPlayersPerTeam = 4; // Updated to match loadDefaultSettings
    const defaultGameDuration = 7; // Updated to match loadDefaultSettings
    const defaultScoring = this.getDefaultScoringValues();
    const defaultAllowExtraTime = false; // Default to false

    this.settingsForm = this.fb.group({
      numTeams: [defaultNumTeams, [Validators.required, Validators.min(1), Validators.max(10)]],
      numPlayersPerTeam: [defaultPlayersPerTeam, [Validators.required, Validators.min(1), Validators.max(11)]],
      gameDuration: [defaultGameDuration, [Validators.required, Validators.min(1), Validators.max(180)]],
      scoring: this.fb.group(this.buildScoringControls()), // Structure built, values patched below
      teams: this.fb.array([]), // Initially empty, populated by updateTeamNameControls
      players: this.fb.array([]), // Initially empty, populated by updatePlayerListAndTeams
      allowExtraTime: [defaultAllowExtraTime] // Add allowExtraTime FormControl
    });

    // Patch the scoring controls with default values
    this.settingsForm.get('scoring')?.patchValue(defaultScoring, { emitEvent: false });

    // Add listeners AFTER the form is created
    this.settingsForm.get('numTeams')?.valueChanges.pipe(distinctUntilChanged()).subscribe(() => this.updatePlayerListAndTeams());
    this.settingsForm.get('numPlayersPerTeam')?.valueChanges.pipe(distinctUntilChanged()).subscribe(() => this.updatePlayerListAndTeams());

    this.updatePlayerListAndTeams(); // Initial population based on the default values set above
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
          scoring: parsedSettings.scoring,
          allowExtraTime: parsedSettings.allowExtraTime // Patch allowExtraTime
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
      teams: { name: string }[],
      allowExtraTime: boolean // Add this property
    } = this.settingsForm.getRawValue();

    // Use default color name if field is empty or just whitespace
    for (let i = 0; i < currentSettings.numTeams; i++) {
      const teamControl = this.teams.at(i).get('name');
      const defaultName = this.defaultTeamColors[i % this.defaultTeamColors.length] || `Team ${i + 1}`;
      const teamName = teamControl?.value?.trim() || defaultName;
      const teamPlayers = this.players.getRawValue().slice(i * currentSettings.numPlayersPerTeam, (i + 1) * currentSettings.numPlayersPerTeam);
    }

    // Build settingsToSave explicitly matching GameSettings interface
    const settingsToSave: GameSettings = {
      numTeams: currentSettings.numTeams,
      numPlayersPerTeam: currentSettings.numPlayersPerTeam,
      gameDuration: currentSettings.gameDuration,
      scoring: currentSettings.scoring,
      allowExtraTime: currentSettings.allowExtraTime,
      teams: [] // This will be populated below
    };

    for (let i = 0; i < currentSettings.numTeams; i++) {
      const teamName = currentSettings.teams[i].name;
      const teamPlayers = currentSettings.players.slice(i * currentSettings.numPlayersPerTeam, (i + 1) * currentSettings.numPlayersPerTeam);
      settingsToSave.teams.push({name: teamName, players: teamPlayers}); // Include name
    }

    settingsToSave.allowExtraTime = currentSettings.allowExtraTime; // Get value from form

    localStorage.setItem('iScoutGameSettings', JSON.stringify(settingsToSave));
    console.log('Settings saved to local storage with teams structure.');
  }
}
