import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommunicationService } from '../../services/share.service';
import { SpinnerComponent } from '../../components/spinner/spinner';
import { finalize } from 'rxjs';
import { AUTH_CAROUSEL_SLIDES } from '../../shared/auth-carousel-slides';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SpinnerComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  carouselSlides = AUTH_CAROUSEL_SLIDES;
  activeSlide = signal(0);
  email = '';
  password = '';
  loading = false;
  isLoading = false;
  isActiveAccount = false;
  errorMessage: string | null = null;
  rememberMe = false;
  showPassword = signal(false);
  returnUrl: string = '/evenements';
  private carouselInterval?: ReturnType<typeof setInterval>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private cd: ChangeDetectorRef,
    private communicationService: CommunicationService
  ) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  togglePasswordVisibility() {
    this.showPassword.update(value => !value);
  }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/evenements';
    this.startCarousel();

    google.accounts.id.initialize({
      client_id: '1054058117713-j8or7mvfn32k9r2rk5issg9137bm944a.apps.googleusercontent.com',
      callback: (response: any) => this.handleCredentialResponse(response)
    });

    const googleDiv = document.getElementById('googleSignInDiv');
    if (googleDiv) {
      google.accounts.id.renderButton(googleDiv, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'center',
        width: 340,
        type: 'standard'
      });
    }
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
    this.isLoading = true;
    this.cd.detectChanges();

    this.authService.loginWithGoogle(response.credential)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cd.detectChanges();
      }))
      .subscribe({
        next: (result) => {
          if (result) this.router.navigateByUrl(this.returnUrl);
        },
        error: (error) => {
          if (error.message?.includes('503')) {
            this.router.navigate(['/maintenance']);
          }
          this.errorMessage = error.message || 'Erreur de connexion';
        }
      });
  }

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      Object.values(form.controls).forEach(c => c.markAsTouched());
      return;
    }

    this.loading = true;
    this.authService.login({
      email: form.value.email,
      password: form.value.password,
      rememberMe: this.rememberMe
    }).subscribe(
      (response) => {
        this.loading = false;
        this.router.navigateByUrl(this.returnUrl);
        this.errorMessage = null;
      },
      (error) => {
        this.loading = false;
        if (error.message.includes('429 Too Many Requests')) {
          this.errorMessage = 'Trop de tentatives de connexion. Réessayez plus tard.';
        } else if (error.message.includes('Veuillez activer votre compte!')) {
          this.isActiveAccount = true;
          this.errorMessage = error.message;
        } else if (
          error.message.includes('503 Service Unavailable') ||
          error.message.includes('Le service est en maintenance. Veuillez réessayer plus tard.')
        ) {
          this.router.navigate(['/maintenance']);
        } else {
          this.errorMessage = error.message || 'Erreur de connexion';
        }
      }
    );
  }

  activeAccount() {
    this.router.navigate(['/signup']);
    this.communicationService.sendMessage(true);
  }
}
