import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type ActivatedAccoutStep = 'verification' | 'success';

@Component({
  selector: 'app-verification-code',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verification-code.component.html',
  styleUrls: ['./verification-code.component.scss']
})
export class VerificationCodeComponent {
  currentStep = signal<ActivatedAccoutStep>('verification');
  @Input() email: string = '';
  @Input() email_confirmed: string = '';
  @Input() isActiveAccount: boolean = false;

  @Output() verificationSuccess = new EventEmitter<any>();
  @Output() backToLogin = new EventEmitter<void>();

  verificationCode: string = '';
  loading: boolean = false;
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Lecture des query params
    this.route.queryParams.subscribe(params => {

      const code = params['code'];
      const email = params['email'];

      console.log('code:', code);
      console.log('email:', email);

      // Vérifier si le lien contient bien code + email
      if( (code && email)){
        this.currentStep.set('verification');
        this.email_confirmed = email;
        this.verificationCode = code;
      }

    });
  }

  submitVerificationCode() {
    if (this.verificationCode && this.verificationCode.length === 6) {
      const data = {
        email: this.isActiveAccount ? this.email : this.email_confirmed,
        code: this.verificationCode,
        isActive: true
      };

      this.loading = true;
      this.errorMessage = null;
      console.log('Données envoyées pour vérification :', data);
      this.authService.checkCode(data).subscribe({
        next: (response) => {
          console.log('✅ Code de vérification validé', response);
          this.loading = false;
          this.currentStep.set('success');
          //this.verificationSuccess.emit(response);
        },
        error: (error) => {
          this.loading = false;
          console.error('❌ Erreur lors de la vérification du code :', error);
          this.errorMessage = error.error?.error || error.error.message || 'Échec de la vérification. Réessayez plus tard.';
        }
      });
    } else {
      this.errorMessage = 'Code invalide ou incorrect';
    }
  }

  resendCode() {
    const data = {
      email: this.isActiveAccount ? this.email : this.email_confirmed,
      isActive: true
    };

    this.loading = true;
    this.errorMessage = null;

    this.authService.sendResetEmail(data).subscribe({
      next: (response) => {
        console.log('✅ Code renvoyé avec succès', response);
        this.loading = false;
        // Optionnel : Afficher un message de succès
      },
      error: (error) => {
        console.error('❌ Erreur lors du renvoi du code :', error);
        this.errorMessage = error.error?.error || 'Erreur lors du renvoi du code.';
        this.loading = false;
      }
    });
  }

  redirectToLogin() {
    this.backToLogin.emit();
    this.router.navigate(['/login']);
  }
}
