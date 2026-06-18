import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-terms-of-service',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './terms-of-service.component.html',
  styleUrls: ['./terms-of-service.component.scss']
})
export class TermsOfServiceComponent {
  lastUpdateAt: string = "Février 2026";
  mailto: string = "legal@smartinvite.com";
  phone: string = "+237 6 55 00 23 18";

  back() {
    window.history.back();
  }
}
