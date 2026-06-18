import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders
} from '@angular/common/http';

import {
  BehaviorSubject,
  Observable,
  Subject,
  of,
  throwError
} from 'rxjs';

import {
  catchError,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap
} from 'rxjs/operators';

import { Router } from '@angular/router';
import { environment } from '../../environment/environment';
import { NotificationService } from './notification.service';
import { EventService } from './event.service';

/* =======================
   TYPES
======================= */

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  //accountType: string;
  acceptTerms?: boolean;
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface JwtPayload {
  sub: string;
  role: string;
  email?: string;
  exp?: number;
}

/* =======================
   SERVICE
======================= */

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = environment.production
    ? environment.apiUrlProd + '/auth'
    : environment.apiUrlDev + '/auth';

  private STORAGE_KEYS = {
    ACCESS: 'accessToken',
    REFRESH: 'refreshToken',
    USER: 'currentUser'
  };

  private decodedToken: JwtPayload | null = null;

  private isAuthenticatedSubject =
    new BehaviorSubject<boolean>(this.hasToken());

  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private currentUserSubject =
    new BehaviorSubject<User | null>(null);

  currentUser$ = this.currentUserSubject.asObservable();

  private userCache$?: Observable<any>;
  private refresh$ = new Subject<void>();

  constructor(
    private router: Router,
    private http: HttpClient,
    private notificationService: NotificationService,
    private eventService: EventService
  ) {
    this.loadUserFromStorage();
  }

  /* =======================
     INIT
  ======================= */

  private loadUserFromStorage(): void {
    const token = this.getToken();
    const userStr = localStorage.getItem(this.STORAGE_KEYS.USER);

    if (!token || !userStr || userStr === 'undefined') return;

    try {
      const user: User = JSON.parse(userStr);
      this.decodeToken(token);
      this.currentUserSubject.next(user);
    } catch (e) {
      console.error('[loadUserFromStorage] error', e);
      localStorage.removeItem(this.STORAGE_KEYS.USER);
    }
  }

  private decodeToken(token: string): JwtPayload | null {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;

      const base64 = base64Url
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(base64Url.length + (4 - base64Url.length % 4) % 4, '=');

      const payload = JSON.parse(atob(base64));

      this.decodedToken = payload;
      return payload;
    } catch (e) {
      this.decodedToken = null;
      return null;
    }
  }

  /* =======================
     AUTH API CALLS
  ======================= */

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/register`,
      data
    ).pipe(
      tap(res => this.onAuthSuccess(res)),
      catchError(this.handleError)
    );
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/login`,
      data
    ).pipe(
      tap(res => this.onAuthSuccess(res)),
      catchError(this.handleError)
    );
  }

  getUser(): JwtPayload | null {
    return this.decodedToken;
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  loginWithGoogle(tokenId: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/google-signin`,
      { tokenId }
    ).pipe(
      tap(res => this.onAuthSuccess(res)),
      catchError(this.handleError)
    );
  }

  signupWithGoogle(data: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/google-signup`,
      data
    ).pipe(
      tap(res => this.onAuthSuccess(res)),
      catchError(this.handleError)
    );
  }

  getAllUsers(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/users`, { headers });
  }

  updateUserStatus(email: string, isBlocked: boolean): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.apiUrl}/status`, { email, isBlocked }, { headers });
  }

  getUserInfoForfait(organizerId: number): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/user-info/${organizerId}`
    );
  }

  getAllUsersLinkedToManager(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/users-linked-to-manager/${id}`, { headers });
  }

  sendResetEmail(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, data);
  }

  checkCode(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/check-code`, data);
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, data);
  }

  updatePassword(userId: number, data: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/update-password/${userId}`,
      data
    );
  }

  deleteAccount(userId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/delete-account/${userId}`
    );
  }

  contactUs(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/contact-us`, data);
  }

  updateProfile(userId: number, data: any): Observable<Event> {
    const headers = this.getAuthHeaders();
    return this.http
    .put<Event>(`${this.apiUrl}/${userId}`, data, { headers })
    .pipe(
      tap(() => this.clearCache()),
    );
  }

  /* =======================
     AUTH SUCCESS HANDLER
  ======================= */

  private onAuthSuccess(response: AuthResponse): void {
    localStorage.setItem(this.STORAGE_KEYS.ACCESS, response.accessToken);
    localStorage.setItem(this.STORAGE_KEYS.REFRESH, response.refreshToken);
    localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(response.user));

    this.decodeToken(response.accessToken);
    this.currentUserSubject.next(response.user);

    this.notificationService.clearNotificationsCache();
    this.eventService.clearCache();
  }

  /* =======================
     USER / TOKEN
  ======================= */

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.STORAGE_KEYS.ACCESS);
  }

  getToken(): string | null {
    return localStorage.getItem(this.STORAGE_KEYS.ACCESS);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.STORAGE_KEYS.REFRESH);
  }

  /* =======================
     AUTH HEADERS
  ======================= */

  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.getToken()}`,
      'Content-Type': 'application/json'
    });
  }

  /* =======================
     AUTH STATE
  ======================= */

  isAuthenticated(): Observable<boolean> {
    const valid = !!this.decodedToken && !this.isTokenExpired();

    if (valid) {
      this.isAuthenticatedSubject.next(true);
      return of(true);
    }

    return this.refreshToken().pipe(
      map(() => {
        const refreshed =
          !!this.decodedToken && !this.isTokenExpired();

        this.isAuthenticatedSubject.next(refreshed);
        return refreshed;
      }),
      catchError(() => {
        this.isAuthenticatedSubject.next(false);
        return of(false);
      })
    );
  }

  isTokenExpired(): boolean {
    if (!this.decodedToken?.exp) return true;
    return this.decodedToken.exp < Math.floor(Date.now() / 1000);
  }

  /* =======================
     REFRESH TOKEN
  ======================= */

  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token'));
    }

    return this.http.post<AuthResponse>(
      `${this.apiUrl}/refresh-token`,
      { refreshToken }
    ).pipe(
      tap(res => {
        localStorage.setItem(this.STORAGE_KEYS.ACCESS, res.accessToken);
        localStorage.setItem(this.STORAGE_KEYS.REFRESH, res.refreshToken);
        this.decodeToken(res.accessToken);
      }),
      map(() => true),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  /* =======================
     ME + CACHE
  ======================= */

  getMe(): Observable<any> {
    if (!this.userCache$) {
      this.userCache$ = this.http
        .get(`${this.apiUrl}/me`, {
          headers: this.getAuthHeaders()
        })
        .pipe(shareReplay(1));
    }

    return this.refresh$.pipe(
      startWith(void 0),
      switchMap(() => this.userCache$!)
    );
  }

  clearCache(): void {
    this.userCache$ = undefined;
  }

  /* =======================
     LOGOUT
  ======================= */

  logout(): void {
    [
      this.STORAGE_KEYS.ACCESS,
      this.STORAGE_KEYS.REFRESH,
      this.STORAGE_KEYS.USER,
      'dashboard-tour',
      'event-detail-tour',
      'guest-list-tour',
      'header-tour'
    ].forEach(k => localStorage.removeItem(k));

    this.decodedToken = null;
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);

    this.router.navigate(['/']);
  }

  /* =======================
     ERROR HANDLER
  ======================= */

  private handleError = (error: HttpErrorResponse) => {
    console.log("###Error: ", error.error.error);
    let message = 'Une erreur est survenue.';

    if (error.error instanceof ErrorEvent) {
      message = `Erreur réseau : ${error.error.message}`;
    } else {
      switch (error.status) {
        case 0:
          message = error.error.error || error.error.message || 'Serveur inaccessible';
          break;
        case 400:
          message = error.error.error || error.error.message || 'Requête invalide';
          break;
        case 401:
          message = error.error.error || error.error.message || 'Non autorisé';
          break;
        case 403:
          message = error.error.error || error.error.message || 'Accès refusé';
          break;
        case 409:
          message = error.error.error || error.error.message || 'Conflit';
          break;
        case 500:
          message = error.error.error || error.error.message || 'Erreur serveur';
          break;
      }
    }

    return throwError(() => new Error(message));
  };
}
