import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ConfirmDeleteModalComponent } from "../confirm-delete-modal/confirm-delete-modal";

interface NewGuest {
  name: string;
  email: string;
  phone?: string;
  dietaryRestrictions?: string;
  plusOne: boolean;
  notificationMode: 'whatsapp' | 'email';
}

interface CountryDialCode {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

@Component({
  selector: 'app-add-guest-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDeleteModalComponent],
  templateUrl: `add-guest-modal.html`,
  styleUrl: 'add-guest-modal.scss'
})
export class AddGuestModalComponent implements OnInit {
  @Output() guestAdded = new EventEmitter<NewGuest>();
  @Output() closed = new EventEmitter<void>();

  newGuest: NewGuest = {
    name: '',
    email: '',
    phone: '',
    plusOne: false,
    notificationMode: 'whatsapp'
  };
  notificationMeans = {
    whatsapp: true,
    email: false
  };
  notificationMode: 'whatsapp' | 'email' = 'whatsapp';
  phoneLocalNumber = '';
  selectedCountryCode = 'CM';
  countryDialCodes: CountryDialCode[] = [
    { name: 'Cameroun', code: 'CM', dialCode: '+237', flag: '🇨🇲' },
    { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
    { name: 'Belgique', code: 'BE', dialCode: '+32', flag: '🇧🇪' },
    { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
    { name: 'Etats-Unis', code: 'US', dialCode: '+1', flag: '🇺🇸' },
    { name: 'Suisse', code: 'CH', dialCode: '+41', flag: '🇨🇭' },
    { name: 'Bresil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
    { name: 'Maurice', code: 'MU', dialCode: '+230', flag: '🇲🇺' },
    { name: 'Tchad', code: 'TD', dialCode: '+235', flag: '🇹🇩' },
    { name: 'Royaume-Uni', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
    { name: 'Allemagne', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
    { name: 'Espagne', code: 'ES', dialCode: '+34', flag: '🇪🇸' },
    { name: 'Italie', code: 'IT', dialCode: '+39', flag: '🇮🇹' },
    { name: 'Maroc', code: 'MA', dialCode: '+212', flag: '🇲🇦' },
    { name: 'Algerie', code: 'DZ', dialCode: '+213', flag: '🇩🇿' },
    { name: 'Tunisie', code: 'TN', dialCode: '+216', flag: '🇹🇳' },
    { name: 'Senegal', code: 'SN', dialCode: '+221', flag: '🇸🇳' },
    { name: "Cote d'Ivoire", code: 'CI', dialCode: '+225', flag: '🇨🇮' },
    { name: 'Mali', code: 'ML', dialCode: '+223', flag: '🇲🇱' },
    { name: 'Burkina Faso', code: 'BF', dialCode: '+226', flag: '🇧🇫' },
    { name: 'Benin', code: 'BJ', dialCode: '+229', flag: '🇧🇯' },
    { name: 'Togo', code: 'TG', dialCode: '+228', flag: '🇹🇬' },
    { name: 'Gabon', code: 'GA', dialCode: '+241', flag: '🇬🇦' },
    { name: 'Congo', code: 'CG', dialCode: '+242', flag: '🇨🇬' },
    { name: 'RDC', code: 'CD', dialCode: '+243', flag: '🇨🇩' },
    { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬' },
    { name: 'Ghana', code: 'GH', dialCode: '+233', flag: '🇬🇭' },
    { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪' },
    { name: 'Afrique du Sud', code: 'ZA', dialCode: '+27', flag: '🇿🇦' }
  ];

  showAlerteModal = false;
  showErrorModal = false;
  warningMessage: string = "";
  errorMessage = '';

  currentUser: User | null = null;
  pollingInterval: any;

  constructor(private authService: AuthService,) { }

  ngOnInit(): void {
    // this.authService.currentUser$.subscribe(user => {
    //   this.currentUser = user;
    // });

    // Polling toutes les 15 secondes pour les mises à jour
    this.pollingInterval = setInterval(() => {
      //console.log("⏱️ Polling pour les mises à jour...");
      this.loadCurrentUserData();
    }, 10000);
  }

  ngOnDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  loadCurrentUserData() {
    this.authService.getMe().subscribe({
      next: (data) => {
        //console.log("🔄 Données utilisateur mises à jour :", data)
        this.currentUser = data;
      }
    });
  }

  onSubmit() {
    if (this.notificationMode === 'email' && this.newGuest.name && this.newGuest.email) {
      //console.log("New Guest: ", this.newGuest);
      this.guestAdded.emit(this.newGuest);
      this.resetForm();
    }else if (this.notificationMode === 'whatsapp' && this.newGuest.name && this.buildInternationalPhoneNumber()) {
      //console.log("New Guest: ", this.newGuest);
        this.guestAdded.emit({
          ...this.newGuest,
          phone: this.buildInternationalPhoneNumber()
        });
        this.resetForm();
    }
  }

  toggleNotificationMeans() {
    this.notificationMeans.email = !this.notificationMeans.whatsapp;
    this.newGuest.notificationMode = this.notificationMeans.whatsapp ? 'whatsapp' : 'email';
    this.notificationMode = this.newGuest.notificationMode;
  }

  confirmAlert() {
    this.showAlerteModal = false;
    console.log("New Guest: ", this.newGuest);
    this.guestAdded.emit(this.newGuest);
    this.resetForm();
  }

  closeModal() {
    this.closed.emit();
  }

  onCountryDialCodeChange() {
    this.newGuest.phone = this.buildInternationalPhoneNumber();
  }

  onPhoneLocalNumberChange(value: string) {
    this.phoneLocalNumber = value;
    this.newGuest.phone = this.buildInternationalPhoneNumber();
  }

  private buildInternationalPhoneNumber(): string {
    const phoneValue = this.phoneLocalNumber.trim();

    if (!phoneValue) {
      return '';
    }

    const sanitizedPhone = phoneValue.replace(/[^\d+]/g, '');

    if (sanitizedPhone.startsWith('+')) {
      return `+${sanitizedPhone.slice(1).replace(/\D/g, '')}`;
    }

    const nationalNumber = sanitizedPhone.replace(/\D/g, '').replace(/^0+/, '');
    return nationalNumber ? `${this.getSelectedCountryDialCode()}${nationalNumber}` : '';
  }

  private getSelectedCountryDialCode(): string {
    return this.countryDialCodes.find(country => country.code === this.selectedCountryCode)?.dialCode || '+237';
  }

  resetForm() {
    this.newGuest = {
      name: '',
      email: '',
      phone: '',
      dietaryRestrictions: '',
      plusOne: false,
      notificationMode: 'whatsapp'
    };
    this.phoneLocalNumber = '';
    this.selectedCountryCode = 'CM';
    this.notificationMeans = {
      whatsapp: true,
      email: false
    };
    this.notificationMode = 'whatsapp';
  }
}

