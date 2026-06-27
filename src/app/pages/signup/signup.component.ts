import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService, RegisterRequest } from '../../services/auth.service';
import { CommunicationService } from '../../services/share.service';
import { AUTH_CAROUSEL_SLIDES } from '../../shared/auth-carousel-slides';

type ActivatedAccoutStep = 'email' | 'verification' | 'success';

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

    const request: RegisterRequest = {
      name: this.name,
      email: this.email,
      password: this.password,
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
