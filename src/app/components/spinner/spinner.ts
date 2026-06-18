import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spinner.html',
  styleUrls: ['./spinner.css'],
})
export class SpinnerComponent {
  @Input() isLoading = false;
}
