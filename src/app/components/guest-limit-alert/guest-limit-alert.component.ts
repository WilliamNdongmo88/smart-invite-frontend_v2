import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';

export interface GuestLimitAlertConfig {
  maxGuests: number;
  eventName: string;
}

@Component({
  selector: 'app-guest-limit-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'guest-limit-alert.component.html',
  styleUrl: 'guest-limit-alert.component.scss',
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, transform: 'translateY(-10px)' }),
        animate(
          '300ms ease-out',
          style({ height: '*', opacity: 1, transform: 'translateY(0)' })
        )
      ]),
      transition(':leave', [
        animate(
          '200ms ease-in',
          style({ height: 0, opacity: 0, transform: 'translateY(-10px)' })
        )
      ])
    ])
  ]
})
export class GuestLimitAlertComponent {
  @Input() config: GuestLimitAlertConfig | null = null;
  @Input() showAlert = false;
  @Output() dismissed = new EventEmitter<void>();
  @Output() upgradeClicked = new EventEmitter<void>();
  @Output() manageClicked = new EventEmitter<void>();

  get maxGuests(): number {
    return this.config?.maxGuests || 0;
  }

  get eventName(): string {
    return this.config?.eventName || 'Événement';
  }

  constructor(private router: Router) {}

  dismissAlert(): void {
    this.showAlert = false;
    this.dismissed.emit();
  }

  upgradePlan(): void {
    this.upgradeClicked.emit();
  }

  manageGuests(): void {
    this.manageClicked.emit();
    this.dismissAlert();
  }
}
