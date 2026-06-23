import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, shareReplay, tap, catchError, throwError } from 'rxjs';


interface Notifications {
  id: number;
  title: string;
  message: string;
  type: 'invitation' | 'reminder' | 'update' | 'info';
  date: string;
  is_read: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private apiUrl: string | undefined;
  private isProd = environment.production;

  // FIX: refresh$ supprimé (Subject<void> jamais utilisé via .next() dans l'original)
  // Le pattern startWith/switchMap/refresh$ ne se redéclenchait donc jamais.
  private cache$?: Observable<Notifications[]>;

  constructor(private http: HttpClient) {
    if (this.isProd) {
      this.apiUrl = environment.apiUrlProd;
    } else {
      this.apiUrl = environment.apiUrlDev;
    }
  }

  getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // FIX: remplacé startWith/switchMap/refresh$ par un cache simple.
  // FIX: shareReplay({ bufferSize: 1, refCount: true }) + catchError qui vide le cache :
  // une erreur HTTP temporaire n'est plus mise en cache indéfiniment.
  getNotifications(): Observable<Notifications[]> {
    if (!this.cache$) {
      this.cache$ = this.http
        .get<Notifications[]>(`${this.apiUrl}/notification/notifications`)
        .pipe(
          shareReplay({ bufferSize: 1, refCount: true }),
          catchError(err => {
            this.cache$ = undefined; // FIX: invalider le cache sur erreur
            return throwError(() => err);
          })
        );
    }
    return this.cache$;
  }

  clearNotificationsCache() {
    this.cache$ = undefined;
  }

  updateNotificationReading(notifId: number, isRead: boolean): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/notification/read/${notifId}`, {isRead})
    .pipe(
      tap(() => this.clearNotificationsCache())
    );
  }

  deleteNotificationReading(notifId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/notification/delete/${notifId}`)
    .pipe(
      tap(() => this.clearNotificationsCache())
    );
  }
}
