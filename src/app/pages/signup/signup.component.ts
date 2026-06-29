import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService, RegisterRequest } from '../../services/auth.service';
import { CommunicationService } from '../../services/share.service';
import { AUTH_CAROUSEL_SLIDES } from '../../shared/auth-carousel-slides';

type ActivatedAccoutStep = 'email' | 'verification' | 'success';

interface CountryDialCode {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

declare const google: any;

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent implements OnInit, OnDestroy {
  carouselSlides = AUTH_CAROUSEL_SLIDES;
  activeSlide = signal(0);
  currentStep = signal<ActivatedAccoutStep>('verification');
  verificationCode = '';
  newPassword = '';
  name = '';
  email = '';
  phoneLocalNumber = '';
  selectedCountryCode = 'CM';
  notificationMeans = {
    whatsapp: false,
    email: true
  };
  notificationMode: 'whatsapp' | 'email' = 'email';
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
  accountType: string = '';
  email_confirmed = '';
  password = '';
  confirmPassword = '';
  loading = false;
  acceptTerms = false;
  showActiveAccount = false;
  isActiveAccount = false;
  subscribeNewsletter = false;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  passwordStrength = signal<'weak' | 'medium' | 'strong'>('weak');
  errorMessage: string | null = null;
  successMessage: string | null = null;
  hasTyped: boolean = false;
  private carouselInterval?: ReturnType<typeof setInterval>;

  constructor(
    private router: Router,
    private authService: AuthService,
    private cd: ChangeDetectorRef,
    private communicationService: CommunicationService
  ) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  isGoogleEnabled(): boolean {
    return this.acceptTerms && !(this.name.trim().length > 0 || this.email.trim().length > 0);
  }

  ngOnInit(): void {
    this.startCarousel();

    google.accounts.id.initialize({
      client_id: '1054058117713-j8or7mvfn32k9r2rk5issg9137bm944a.apps.googleusercontent.com',
      callback: (response: any) => this.handleCredentialResponse(response)
    });

    const googleDiv = document.getElementById('googleSignUpDiv');
    if (googleDiv) {
      google.accounts.id.renderButton(googleDiv, {
        theme: 'outline',
        size: 'large',
        text: 'signup_with',
        shape: 'rectangular',
        logo_alignment: 'center',
        width: 340,
        type: 'standard'
      });
    }

    this.communicationService.message$.subscribe(msg => {
      this.currentStep.set('email');
      this.showActiveAccount = msg;
      this.isActiveAccount = msg;
    });
  }

  ngOnDestroy(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  setActiveSlide(index: number): void {
    this.activeSlide.set(index);
    this.startCarousel();
  }

  private startCarousel(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
    this.carouselInterval = setInterval(() => {
      this.activeSlide.update(i => (i + 1) % this.carouselSlides.length);
    }, 5000);
  }

  handleCredentialResponse(response: any) {
    this.cd.detectChanges();
    this.authService.signupWithGoogle({
      tokenId: response.credential,
      acceptTerms: this.acceptTerms
    }).subscribe({
      next: (result) => {
        if (result) this.router.navigate(['/evenements']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.message;
        localStorage.clear();
      },
      complete: () => this.cd.detectChanges()
    });
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.update(v => !v);
  }

  checkPasswordStrength() {
    const p = this.password;
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (p.length >= 8) {
      if (/[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^a-zA-Z0-9]/.test(p)) {
        strength = 'strong';
      } else if (
        (/[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p)) ||
        (/[a-z]/.test(p) && /[A-Z]/.test(p)) ||
        (/[a-z]/.test(p) && /[0-9]/.test(p)) ||
        (/[A-Z]/.test(p) && /[0-9]/.test(p))
      ) {
        strength = 'medium';
      }
    }
    this.passwordStrength.set(strength);
  }

  toggleNotificationMeans() {
    this.notificationMeans.email = !this.notificationMeans.whatsapp;
    this.notificationMode = this.notificationMeans.whatsapp ? 'whatsapp' : 'email';
  }

  onCountryDialCodeChange() {
    this.phoneLocalNumber = this.phoneLocalNumber.trimStart();
  }

  getInternationalPhoneNumber(): string {
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

  getPasswordStrengthPercentage(): number {
    return this.passwordStrength() === 'weak' ? 33 : this.passwordStrength() === 'medium' ? 66 : 100;
  }

  getPasswordStrengthLabel(): string {
    return this.passwordStrength() === 'weak' ? 'Faible' : this.passwordStrength() === 'medium' ? 'Moyen' : 'Fort';
  }

  onSubmit(form: NgForm): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (form.invalid) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }
    if (!this.acceptTerms) {
      this.errorMessage = "Vous devez accepter les conditions d'utilisation.";
      return;
    }
    if (this.notificationMode === 'whatsapp' && !this.getInternationalPhoneNumber()) {
      this.errorMessage = 'Veuillez entrer un numero WhatsApp valide.';
      return;
    }

    const request: RegisterRequest = {
      name: this.name,
      email: this.email,
      password: this.password,
      phoneNumber: this.notificationMode === 'whatsapp' ? this.getInternationalPhoneNumber() : undefined,
      notificationMode: this.notificationMode,
      acceptTerms: this.acceptTerms
    };
    this.loading = true;
    this.authService.register(request).subscribe({
      next: (response) => {
        this.currentStep.set('verification');
        this.email_confirmed = this.email;
        this.showActiveAccount = true;
        this.errorMessage = null;
        form.resetForm();
        this.loading = false;
        localStorage.clear();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.message || "Une erreur est survenue lors de l'inscription.";
        localStorage.clear();
      }
    });
  }

  submitEmail() {
    if (!this.email?.trim()) {
      this.errorMessage = 'Veuillez entrer une adresse e-mail.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.errorMessage = 'Adresse e-mail invalide.';
      return;
    }
    this.loading = true;
    this.sendResetEmailService({ email: this.email, isActive: true });
  }

  sendResetEmailService(data: any) {
    this.authService.sendResetEmail(data).subscribe({
      next: () => {
        this.currentStep.set('verification');
        this.errorMessage = '';
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.error.error;
        this.loading = false;
      }
    });
  }

  submitVerificationCode() {
    if (!this.verificationCode || this.verificationCode.length !== 6) {
      this.errorMessage = 'Code invalide ou incorrect';
      return;
    }
    this.loading = true;
    this.authService.checkCode({
      email: this.isActiveAccount ? this.email : this.email_confirmed,
      code: this.verificationCode,
      isActive: true
    }).subscribe({
      next: () => {
        this.currentStep.set('success');
        this.errorMessage = '';
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Echec de la vérification. Réessayez plus tard.';
      }
    });
  }

  resendCode() {
    this.sendResetEmailService({
      email: this.isActiveAccount ? this.email : this.email_confirmed,
      isActive: true
    });
  }

  redirectToLogin() {
    this.router.navigate(['/login']);
  }
}
