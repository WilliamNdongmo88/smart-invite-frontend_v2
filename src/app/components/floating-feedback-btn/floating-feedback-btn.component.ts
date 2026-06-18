import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-floating-feedback-btn',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floating-feedback-btn.component.html',
  styleUrls: ['./floating-feedback-btn.component.scss']
})
export class FloatingFeedbackBtnComponent implements OnInit {
  showTooltip = false;

  constructor(private router: Router) {}

  ngOnInit() {}

  goToFeedback() {
    this.router.navigate(['/feedback']);
  }
}
