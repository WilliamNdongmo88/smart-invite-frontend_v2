import { Injectable } from "@angular/core";
import { CanActivate, NavigationEnd, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { Observable } from "rxjs/internal/Observable";
import { catchError, map, of } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.router.events.subscribe(event => {
      const user = this.authService.getCurrentUser();
      //console.log('[AuthGuard] Vérification du rôle utilisateur :', user);
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects;
        //console.log('[AuthGuard] URL changée :', url);
        if(url.startsWith("/admin") && user?.role !== 'admin'){
          this.router.navigate(['/']);
        }
      }
    });
  }

  canActivate(): Observable<boolean>  {
    console.log('[Guard]: Checking authentication :', this.authService.isAuthenticated());
    console.log('[Guard]: isTokenExpired :', this.authService.isTokenExpired());
    return this.authService.isAuthenticated().pipe(
      map(authenticated => {
        if (authenticated && this.authService.getCurrentUser()) {
          console.log('[Guard]: Authentifié');
          return true;
        }else {
          console.log('[Guard]: Non authentifié ou pas Admin, redirection vers accueil');
          this.router.navigate(['/']);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          return false;
        }
      }),
      catchError(() => {
        console.log('[Guard]: Erreur d\'authentification, redirection vers /');
        this.router.navigate(['/']);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        return of(false);
      })
    );
  }
}