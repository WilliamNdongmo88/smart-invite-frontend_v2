import { Injectable, signal } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, shareReplay, startWith, Subject, switchMap, tap } from 'rxjs';


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
  // notifications = signal<Notification[]>([]);
  private apiUrl: string | undefined;
  private isProd = environment.production;

  private cache$?: Observable<Notifications[]>;
  private refresh$ = new Subject<void>();

  constructor(private http: HttpClient) {
    // Définir l'URL de l'API selon l'environnement
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

  getNotifications(): Observable<Notifications[]> {
    return this.refresh$.pipe(
      startWith(void 0), // première charge
      switchMap(() => {
        if (!this.cache$) {
          console.log('NOTIFICATION API CALL');

          this.cache$ = this.http
            .get<Notifications[]>(`${this.apiUrl}/notification/notifications`)
            .pipe(shareReplay(1));
        }
        console.log('CACHE NOTIFICATION CALL');
        return this.cache$;
      })
    );
  }

  clearNotificationsCache() {
    console.log('CLEAR NOTIFICATION CACHE');
    this.cache$ = undefined;
  }

  updateNotificationReading(notifId: number, isRead: boolean): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/notification/read/${notifId}`, {isRead} )
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

