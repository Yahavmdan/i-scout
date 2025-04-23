import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule

@Component({
  selector: 'app-stats-history',
  standalone: true,
  imports: [CommonModule], // Add CommonModule here
  templateUrl: './stats-history.component.html',
  styleUrls: ['./stats-history.component.css']
})
export class StatsHistoryComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    // Logic to load history data can go here
    console.log('Stats History component initialized');
  }

}
