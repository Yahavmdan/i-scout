import {Routes} from '@angular/router';
import { GameSettingsComponent } from './game-settings/game-settings.component';
import { GameComponent } from './game/game.component';

export const routes: Routes = [
  { path: '', redirectTo: '/settings', pathMatch: 'full' },
  { path: 'settings', component: GameSettingsComponent },
  { path: 'game', component: GameComponent }
];
