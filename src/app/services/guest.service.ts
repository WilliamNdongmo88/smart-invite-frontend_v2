import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../environment/environment';

export interface Guest {
  id?: number;
  eventId: number;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  rsvpStatus?: string;
  hasPlusOne?: boolean;
  plusOneName?: string;
  notes?: string;
}
export interface Guests{
  guest_id: string;
  event_id: number;
  full_name: string;
  table_number: string;
  email: string
  phone_number: string;
  notification_mode: string
  rsvp_status: string
  has_plus_one: boolean
  dietary_restrictions: string
  plus_one_name_diet_restr: string
  plus_one_name: string
  notes: string
  response_date: string
  qr_code_url: string
}

export interface Invitation {
  id: number;
  guestId: number;
  token: string;
  qrCodeUrl: string;
  status: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Event{
  guestId: number;
  guestName: string;
  rsvpStatus: string;
  guestHasPlusOneAutoriseByAdmin: boolean;
  guestHasPlusOne: boolean;
  plusOneName: string;
  eventTitle: string;
  description: string;
  eventHasPlusOne: boolean;
  footRestriction: boolean;
  eventDate: string;
  eventTime: string;
  banquetTime: string;
  eventCivilLocation: string;
  eventLocation: string;
  emailOrganizer: string;
}

@Injectable({
  providedIn: 'root'
} )
export class GuestService {
    private apiUrl: string | undefined;
    private isProd = environment.production;

    private cache = new Map<number, Observable<{ guests: Guests[] }>>();

    // FIX: refresh$ supprimé (Subject<number> jamais utilisé via .next() depuis l'extérieur)
    // getGuestsForEvent() utilisait startWith(eventId) + filter() ce qui créait une
    // race condition si plusieurs composants s'abonnaient pour des eventId différents.
    // Remplacé par un cache Map simple, cohérent avec getEventById() dans event.service.

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

  addGuest(guests: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/guest/add-guest`, guests, { headers })
      .pipe(
        tap(() => this.clearGuestsCache(guests[0].eventId))
      );
  }

  addGuestFromGenerateLink(guest: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/guest/add-guest-from-link`, guest, { headers })
    .pipe(
      tap(() => this.clearGuestsCache(guest.eventId))
    );
  }

  getEventByGuest(guestId: number): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/guest/${guestId}/event/`);
  }

  // FIX: remplacé le pattern refresh$/startWith/filter/switchMap par un cache Map simple.
  // Comportement identique pour les composants existants (même signature, même Observable retourné).
  getGuestsForEvent(eventId: number): Observable<{ guests: Guests[] }> {
    if (!this.cache.has(eventId)) {
      this.cache.set(
        eventId,
        this.http
          .get<{ guests: Guests[] }>(`${this.apiUrl}/guest/event/${eventId}`)
          .pipe(shareReplay(1))
      );
    }
    return this.cache.get(eventId)!;
  }

  clearGuestsCache(eventId: number) {
    this.cache.delete(eventId);
  }

  getInfoForfait(eventId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/guest/event-info/${eventId}`);
  }

  getGuestById(guestId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/guest/${guestId}`);
  }

  // FIX: clearGuestsCache() déplacé dans tap() post-réponse HTTP
  // (l'original invalidait le cache AVANT la réponse → cache vidé même si la requête échoue)
  updateGuest(guestId: number, guest: any): Observable<Guest> {
    return this.http.put<Guest>(`${this.apiUrl}/guest/${guestId}`, guest).pipe(
      tap(() => this.clearGuestsCache(guest.eventId))
    );
  }

  updateRsvpStatusGuest(guestId: number, rsvpStatus: string, eventId?: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/guest/rsvp/${guestId}`, {rsvpStatus}).pipe(
      tap(() => { if (eventId) this.clearGuestsCache(eventId); })
    );
  }

  deleteGuest(guestId: number, eventId: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.apiUrl}/guest/${guestId}`, { headers })
    .pipe(
      tap(() => this.clearGuestsCache(eventId))
    );
  }

  deleteSeveralGuests(guestIdList: number[], eventId: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.post<void>(`${this.apiUrl}/guest/delete`, guestIdList, {headers})
    .pipe(
      tap(() => this.clearGuestsCache(eventId))
    );
  }

  createInvitation(invitation: Invitation): Observable<Invitation> {
    return this.http.post<Invitation>(`${this.apiUrl}/invitations/generate`, invitation);
  }

  getInvitationsByGuestId(guestId: number): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(`${this.apiUrl}/invitations/guest/${guestId}`);
  }

  revokeInvitation(guestId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/invitation/delete/${guestId}`);
  }

  sendReminderMail(guestIList: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/guest/reminde-mail`, guestIList, { headers });
  }

  sendFileQrCode(guestId: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/guest/${guestId}/send-file`, { headers });
  }
}
