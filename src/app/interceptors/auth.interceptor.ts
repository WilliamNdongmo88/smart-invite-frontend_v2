import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  console.log('[Interceptor] Interception de la requête:', req.url);

  // Exclure refresh-token de l’interceptor
  if (req.url.includes('/auth/refresh-token')) {
    return next(req);
  }

  if (token) {
    // Clone request and add authorization header
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};

