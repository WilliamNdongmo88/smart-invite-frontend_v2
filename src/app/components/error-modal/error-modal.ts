import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-error-modal',
  imports: [CommonModule],
  templateUrl: './error-modal.html',
  styleUrls: ['./error-modal.scss']
})
export class ErrorModalComponent {
  @Input() message: string = 'Une erreur est survenue.';
  @Input() visible: boolean = false;
  @Output() closed = new EventEmitter<void>();
  @Input() alertMessage: 'error' | 'alert' = 'error';

  close() {
    this.closed.emit();
  }
}
