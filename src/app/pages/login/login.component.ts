import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommunicationService } from '../../services/share.service';
import { SpinnerComponent } from "../../components/spinner/spinner";
import { finalize } from 'rxjs';

declare const google: any;
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SpinnerComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements  OnInit{
  email = '';
  password = '';
  loading = false;
  isLoading = false;
  isActiveAccount = false;
  errorMessage: string | null = null;
  rememberMe = false;
  showPassword = signal(false);
  returnUrl: string = '/evenements';

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

    google.accounts.id.initialize({
      client_id: '1054058117713-j8or7mvfn32k9r2rk5issg9137bm944a.apps.googleusercontent.com',
      callback: (response: any) => this.handleCredentialResponse(response)
    });

    // Rendu du bouton
    const googleDiv = document.getElementById('googleSignInDiv');
    console.log('googleDiv: ', googleDiv);

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

  handleCredentialResponse(response: any) {

    this.isLoading = true;
    this.cd.detectChanges();

    const googleIdToken = response.credential;

    this.authService.loginWithGoogle(googleIdToken)
      .pipe(
        finalize(() => {
          // toujours exécuté
          this.isLoading = false;
          this.cd.detectChanges();
        })
      )
      .subscribe({
        next: (result) => {
          console.log('✅ Connexion Google réussie', result);
          if (result) {
            this.router.navigateByUrl(this.returnUrl);
          }
        },
        error: (error) => {
          console.error(
            "Erreur Google :",
            error.error?.error ||
            error.error?.message ||
            error.message
          );

          if (error.message?.includes('503')) {
            this.router.navigate(['/maintenance']);
          }

          this.errorMessage = error.message || 'Erreur de connexion';
        }
      });
  }

  // gestion de la soumission du formulaire
  onSubmit(form: NgForm): void {
    if (form.invalid) {
      // Marque tous les champs comme "touchés" pour déclencher l’affichage des erreurs
      Object.values(form.controls).forEach(control => {
        control.markAsTouched();
      });
      return;
    }

    // Si valide, exécute ta logique d’authentification
    console.log('Formulaire valide :', form.value);
    this.loading = true;
    const loginRequest = {
      email: form.value.email,
      password: form.value.password,
      rememberMe: this.rememberMe
    };
    this.authService.login(loginRequest).subscribe(
      (response) => {
        console.log("Message :: ", response.message)
        this.loading = false;
        this.router.navigateByUrl(this.returnUrl);
        this.errorMessage = null;
      },
      (error) => {
        this.loading = false;
        console.error('❌ Erreur de connexion :', error.message);
        console.log("Message :: ", error.message.split(':')[4])
        if (error.message.includes('429 Too Many Requests')) {
          this.errorMessage = 'Trop de tentatives de connexion. Réessayez plus tard.';
        }else if (error.message.includes('Veuillez activer votre compte!')){
          this.isActiveAccount = true;
          this.errorMessage = error.message;
        }else if (error.message.includes('503 Service Unavailable') ||
                  error.message.includes('Le service est en maintenance. Veuillez réessayer plus tard.')) {
          this.router.navigate(['/maintenance']);
        }else {
          this.errorMessage = error.message || 'Erreur de connexion';
        }
      }
    );
  }

  activeAccount(){
    this.router.navigate(['/signup']);
    this.communicationService.sendMessage(true);
  }

  // loginWithGoogle() {
  //   alert('🔵 Connexion avec Google...');
  // }
}

