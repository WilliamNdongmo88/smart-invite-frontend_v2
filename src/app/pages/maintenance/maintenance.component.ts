import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './maintenance.component.html',
  styleUrls: ['./maintenance.component.scss']
})
export class MaintenanceComponent implements OnInit {
  maintenanceProgress = 65;
  estimatedTime = '2-4 heures';
  lastUpdate = 'Il y a 15 minutes';
  email = '';
  subscribed = false;

  constructor() {}

  ngOnInit() {
    // Simuler la progression
    this.simulateProgress();
  }

  simulateProgress() {
    setInterval(() => {
      if (this.maintenanceProgress < 95) {
        this.maintenanceProgress += Math.random() * 5;
      }
    }, 5000);
  }

  subscribeNewsletter() {
    if (this.email) {
      console.log('Email inscrit:', this.email);
      this.subscribed = true;
      setTimeout(() => {
        this.email = '';
        this.subscribed = false;
      }, 3000);
    }
  }
}
