import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatTime', // The name used in the template
  standalone: true // Mark pipe as standalone
})
export class FormatTimePipe implements PipeTransform {

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value) || value < 0) {
      return '00:00'; // Return default for invalid input
    }

    const minutes: number = Math.floor(value / 60);
    const seconds: number = Math.floor(value % 60);

    // Pad with leading zeros if needed
    const formattedMinutes: string = String(minutes).padStart(2, '0');
    const formattedSeconds: string = String(seconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
  }

}
