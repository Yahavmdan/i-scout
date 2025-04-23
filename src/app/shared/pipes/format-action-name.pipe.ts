import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatActionName',
  standalone: true // Make the pipe standalone
})
export class FormatActionNamePipe implements PipeTransform {

  transform(value: string): string {
    if (!value) {
      return '';
    }

    // Insert space before capital letters (but not the first character)
    const spaced = value.replace(/([A-Z])/g, ' $1');

    // Capitalize the first letter and make the rest lowercase (optional, depends on desired style)
    // For "Goal Assist" style:
    const final = spaced.charAt(0).toUpperCase() + spaced.slice(1);
    
    // Or for simple spacing like "goal Assist":
    // const final = spaced; 

    return final.trim(); // Trim potential leading/trailing spaces
  }

}
