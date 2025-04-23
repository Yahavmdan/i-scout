import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';
import { GameComponent } from '../components/game/game.component'; // Adjust path if necessary

export interface CanComponentDeactivate {
  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
}

/**
 * Confirms if the user wants to leave the Game page if a game is in progress.
 */
export const unsavedGameGuard: CanDeactivateFn<GameComponent> = (
  component: GameComponent,
  // currentRoute: ActivatedRouteSnapshot, // Optional: Not needed for this logic
  // currentState: RouterStateSnapshot,    // Optional: Not needed for this logic
  // nextState?: RouterStateSnapshot       // Optional: Not needed for this logic
): Observable<boolean> | Promise<boolean> | boolean => {

  // Check if a game is considered "in progress"
  const isGameInProgress = component.isTimerRunning || (component.isTimedPlayOver && !component.isFinalResultDeclared);

  if (isGameInProgress) {
    // If game is in progress, ask for confirmation
    return confirm(
      'WARNING: You have an unsaved game in progress! \
      Leaving this page will discard all current game data. \
      Are you sure you want to leave?'
    );
  }

  // If no game is in progress, allow navigation
  return true;
};
