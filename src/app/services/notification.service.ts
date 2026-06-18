import { Injectable, signal } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, shareReplay, startWith, Subject, switchMap, tap } from 'rxjs';

// export interface NotificationConfig {
//   title: string;
//   message: string;
//   type: 'info' | 'warning' | 'error' | 'success' | 'confirm';
//   yesText?: string;
//   noText?: string;
//   onYes?: () => void;
//   onNo?: () => void;
//   autoClose?: boolean;
//   duration?: number; // en millisecondes
// }

interface Notifications {
  id: number;
  title: string;
  message: string;
  type: 'invitation' | 'reminder' | 'update' | 'info';
  date: string;
  is_read: boolean;
}

// export interface Notification extends NotificationConfig {
//   id: string;
// }

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

  // show(config: NotificationConfig): string {
  //   const id = Math.random().toString(36).substr(2, 9);
  //   const notification: Notification = {
  //     ...config,
  //     id,
  //     yesText: config.yesText || 'Oui',
  //     noText: config.noText || 'Non',
  //     autoClose: config.autoClose !== false,
  //     duration: config.duration || 5000,
  //   };

  //   this.notifications.update(notifs => [...notifs, notification]);

  //   // Auto-close après la durée spécifiée
  //   if (notification.autoClose && notification.type !== 'confirm') {
  //     setTimeout(() => {
  //       this.remove(id);
  //     }, notification.duration);
  //   }

  //   return id;
  // }

  // remove(id: string): void {
  //   this.notifications.update(notifs => notifs.filter(n => n.id !== id));
  // }

  // handleYes(notification: Notification): void {
  //   if (notification.onYes) {
  //     notification.onYes();
  //   }
  //   this.remove(notification.id);
  // }

  // handleNo(notification: Notification): void {
  //   if (notification.onNo) {
  //     notification.onNo();
  //   }
  //   this.remove(notification.id);
  // }

  // // Méthodes de commodité
  // info(title: string, message: string): string {
  //   return this.show({ title, message, type: 'info' });
  // }

  // success(title: string, message: string): string {
  //   return this.show({ title, message, type: 'success' });
  // }

  // warning(title: string, message: string): string {
  //   return this.show({ title, message, type: 'warning' });
  // }

  // error(title: string, message: string): string {
  //   return this.show({ title, message, type: 'error' });
  // }

  // confirm(
  //   title: string,
  //   message: string,
  //   onYes: () => void,
  //   onNo?: () => void
  // ): string {
  //   return this.show({
  //     title,
  //     message,
  //     type: 'confirm',
  //     onYes,
  //     onNo,
  //     autoClose: false,
  //   });
  // }

  // getNotifications(): Observable<Notifications[]> {
  //   return this.http.get<Notifications[]>(`${this.apiUrl}/notification/notifications`);
  // }
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

