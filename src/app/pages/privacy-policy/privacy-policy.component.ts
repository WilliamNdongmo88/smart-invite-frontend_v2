import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: `privacy-policy.component.html`,
  styleUrls: [`privacy-policy.component.scss`]
})
export class PrivacyPolicyComponent {
  lastUpdateAt: string = "Février 2026";
  mailtoDpo: string = "dpo@smartinvite.com";
  mailtoPrivacy: string = "privacy@smartinvite.com";
  phone: string = "+237 6 55 00 23 18";

  back() {
    window.history.back();
  }
}
