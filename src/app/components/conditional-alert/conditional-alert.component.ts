import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

export interface AlertConfig {
  condition: boolean; // Condition pour afficher l'alerte
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  icon?: string;
  dismissible?: boolean;
  autoClose?: boolean;
  duration?: number; // en millisecondes
}

@Component({
  selector: 'app-conditional-alert',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ transform: 'translateY(-100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(-100%)', opacity: 0 }))
      ])
    ])
  ],
  templateUrl: 'conditional-alert.component.html',
  styleUrl: 'conditional-alert.component.scss'
})
export class ConditionalAlertComponent {
  @Input() config: AlertConfig = {
    condition: false,
    type: 'info',
    title: '',
    message: '',
    dismissible: true,
    autoClose: true,
    duration: 5000,
  };

  isVisible = signal(true);

  ngOnInit() {
    // Auto-close si activé
    if (this.config.autoClose && this.config.duration) {
      setTimeout(() => {
        this.dismiss();
      }, this.config.duration);
    }
  }

  dismiss() {
    this.isVisible.set(false);
  }

  getDefaultIcon(): string {
    switch (this.config.type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠️';
      case 'error':
        return '✕';
      case 'info':
        return 'ℹ️';
      default:
        return '📬';
    }
  }
}

