import { Routes } from '@angular/router';
import { GameSettingsComponent } from './components/game-settings/game-settings.component';
import { GameComponent } from './components/game/game.component';
import { StatsHistoryComponent } from './components/stats-history/stats-history.component';
import { unsavedGameGuard } from './guards/unsaved-game.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/settings',
    pathMatch: 'full'
  },
  {
    path: 'settings',
    component: GameSettingsComponent,
    title: 'iScout - Game Settings'
  },
  {
    path: 'game',
    component: GameComponent,
    title: 'iScout - Game',
    canDeactivate: [unsavedGameGuard]
  },
  {
    path: 'history',
    component: StatsHistoryComponent,
    title: 'iScout - Stats History'
  },
  // Consider adding a wildcard route for 404 handling later
  // { path: '**', component: PageNotFoundComponent }
];
