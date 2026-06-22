import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, filter, Observable, of, shareReplay, startWith, Subject, switchMap, tap } from 'rxjs';
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
    private refresh$ = new Subject<number>();

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

  // addGuest(guests: any): Observable<any> {
  //   console.log("guests :: ",guests);
  //   const headers = this.getAuthHeaders();
  //   return this.http.post<any>(`${this.apiUrl}/guest/add-guest`, guests, { headers })
  // }
  addGuest(guests: any): Observable<any> {
    console.log("###guests :: ",guests);
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/guest/add-guest`, guests, { headers })
      .pipe(
        tap(() => this.clearGuestsCache(guests[0].eventId))
      );
  }

  addGuestFromGenerateLink(guest: any): Observable<any> {
    console.log("guest :: ",guest);
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/guest/add-guest-from-link`, guest, { headers })
    .pipe(
      tap(() => this.clearGuestsCache(guest.eventId))
    );
  }

  // getGuests(): Observable<{ guests: Guests[] }> {
  //   return this.http.get<{ guests: Guests[] }>(`${this.apiUrl}/guest/all-guests`);
  // }

  getEventByGuest(guestId: number): Observable<Event> {
    console.log("guestId :: ",guestId);
    return this.http.get<Event>(`${this.apiUrl}/guest/${guestId}/event/`);
  }

  // getGuestsForEvent(eventId: number): Observable<{ guests: Guests[] }> {
  //   console.log("eventId :: ",eventId);
  //   return this.http.get<{ guests: Guests[] }>(`${this.apiUrl}/guest/event/${eventId}`);
  // }
  getGuestsForEvent(eventId: number): Observable<{ guests: Guests[] }> {
    return this.refresh$.pipe(
      startWith(eventId), // première charge
      filter(id => id === eventId),
      switchMap(() => {
        if (!this.cache.has(eventId)) {
          console.log('GUEST API CALL for eventId:', eventId);

          this.cache.set(
            eventId,
            this.http
              .get<{ guests: Guests[] }>(`${this.apiUrl}/guest/event/${eventId}`)
              .pipe(shareReplay(1))
          );
        }
        return this.cache.get(eventId)!;
      })
    );
  }

  clearGuestsCache(eventId: number) {
    this.cache.delete(eventId);
  }

  getInfoForfait(eventId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/guest/event-info/${eventId}`);
  }

  getGuestById(guestId: number): Observable<any> {
    console.log("guestId :: ", guestId);
    return this.http.get<any>(`${this.apiUrl}/guest/${guestId}` );
  }

  updateGuest(guestId: number, guest: any): Observable<Guest> {
    this.clearGuestsCache(guest.eventId)
    return this.http.put<Guest>(`${this.apiUrl}/guest/${guestId}`, guest );
  }

  updateRsvpStatusGuest(guestId: number, rsvpStatus: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/guest/rsvp/${guestId}`, {rsvpStatus} );
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
    console.log("### guestIdList :: ", guestIdList);
    return this.http.post<void>(`${this.apiUrl}/guest/delete`, guestIdList, {headers})
    .pipe(
      tap(() => this.clearGuestsCache(eventId))
    );
  }


  // Méthode pour créer une invitation pour un invité existant
  createInvitation(invitation: Invitation): Observable<Invitation> {
    return this.http.post<Invitation>(`${this.apiUrl}/invitations/generate`, invitation );
  }

  getInvitationsByGuestId(guestId: number): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(`${this.apiUrl}/invitations/guest/${guestId}` );
  }

  // Méthode pour révoquer une invitation
  revokeInvitation(guestId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/invitation/delete/${guestId}` );
  }

  sendReminderMail(guestIList: any): Observable<any> {
    console.log("guestIList :: ",guestIList);
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/guest/reminde-mail`, guestIList, { headers })
  }

  sendFileQrCode(guestId: any): Observable<any> {
    console.log("guestId :: ",guestId);
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/guest/${guestId}/send-file`, { headers })
  }
}

