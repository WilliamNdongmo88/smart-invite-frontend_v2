import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, shareReplay, startWith, Subject, switchMap, tap } from 'rxjs';
import { environment } from '../../environment/environment';

export interface Event {
  event_id: number;
  organizerId: number;
  title: string;
  description: string;
  event_civil_location: string;
  event_date: string;
  banquet_time: string;
  religious_location: string,
  religious_time: string,
  event_location: string;
  max_guests: number;
  type: string;
  budget?: number;
  status: string;
  event_name_concerned1?: string;
  event_name_concerned2?: string;
  organizer_id?: number
  foot_restriction?: boolean;
  show_wedding_religious_location: boolean;
  has_plus_one?: boolean;
  confirmed_count: number;
  pending_count: number;
  declined_count: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  organizerId?: number;
  title: string;
  description: string;
  eventDate: string;
  banquetTime: string;
  religiousLocation: string,
  religiousTime: string,
  eventCivilLocation: string;
  eventLocation: string;
  maxGuests: number;
  hasPlusOne?: boolean;
  footRestriction?: boolean;
  allowDietaryRestrictions?: boolean;
  showWeddingReligiousLocation?: boolean;
  hasInvitationModelCard?: boolean;
  eventEndDate?: string | null;
  status: string;
  budget?: number;
  type?: string;
  eventNameConcerned1?: string;
  eventNameConcerned2?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl: string | undefined;
  private isProd = environment.production;

  private cache = new Map<number, Observable<{ events: Event[] }>>();
  private cachedEvent = new Map<number, Observable<Event[]>>();
  private cachedEventInvtNote = new Map<number, Observable<any>>();

  private linksSubject = new BehaviorSubject<any | null>(null);
  links$ = this.linksSubject.asObservable();
  private linkCache$?: Observable<any>;
  private refresh$ = new Subject<void>();

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

  getEvents(organizerId: number): Observable<{ events: Event[] }> {
    return this.http.get<{ events: Event[] }>(`${this.apiUrl}/event/organizer/${organizerId}`);
  }
  // getEvents(organizerId: number): Observable<{ events: Event[] }> {
  //   if (this.cache.has(organizerId)) {
  //     console.log('CACHE HIT for organizerId:', organizerId);
  //     return this.cache.get(organizerId)!;
  //   }

  //   console.log('API CALL for organizerId:', organizerId);

  //   const request$ = this.http
  //     .get<{ events: Event[] }>(`${this.apiUrl}/event/organizer/${organizerId}`)
  //     .pipe(
  //       shareReplay(1)
  //     );

  //   this.cache.set(organizerId, request$);
  //   return request$;
  // }

  // getEventById(eventId: number): Observable<Event[]> {
  //   console.log("eventId :: ",eventId);
  //   return this.http.get<Event[]>(`${this.apiUrl}/event/${eventId}`);
  // }

  getEventById(eventId: number): Observable<Event[]> {
    if (this.cachedEvent.has(eventId)) {
      console.log('CACHE HIT for eventId:', eventId);
      return this.cachedEvent.get(eventId)!;
    }

    console.log('API CALL for eventId:', eventId);

    const request$ = this.http
      .get<Event[]>(`${this.apiUrl}/event/${eventId}`)
      .pipe(
        shareReplay(1)
      );

    this.cachedEvent.set(eventId, request$);
    return request$;
  }

  getEventInvitNote(eventId: number): Observable<any> {
    console.log("eventId :: ",eventId);
    return this.http.get<Event[]>(`${this.apiUrl}/event/event-inv-note/${eventId}`);
  }

  // Vider le cache pour un event
  clearCache(eventId?: number) {
    if (eventId) {
      this.cache.delete(eventId);
      this.cachedEvent.delete(eventId);
    } else {
      this.cache.clear();
      this.cachedEvent.clear();
    }
  }

  getEventAndInvitationRelated(eventId: number): Observable<Event[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Event[]>(`${this.apiUrl}/event/${eventId}/invitation`, {headers});
  }

  createEvent(request: any): Observable<any> {
    console.log('Creating event with data:', request);
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/event/create-event`, request, { headers })
    .pipe(
      tap(() => this.clearCache())
    );
  }

  createEventWihtFile(formData: any): Observable<any> {
    console.log('Creating event with data:', formData);
    return this.http.post<any>(`${this.apiUrl}/file/create-event-file`, formData);
  }

  updateEventWihtFile(eventId: number, formData: any): Observable<any> {
    console.log("formData :: ", formData);
    return this.http
      .put<any>(`${this.apiUrl}/file/update-event-file/${eventId}`, formData);
  }

  updateEvent(eventId: number, request: Partial<any>): Observable<Event> {
    console.log("request :: ", request);
    const headers = this.getAuthHeaders();
    return this.http
    .put<Event>(`${this.apiUrl}/event/${eventId}`, request, { headers })
    .pipe(
      tap(() => this.clearCache(eventId))
    );
  }

  updateEventStatus(eventId: number, status: string): Observable<Event> {
    return this.http.patch<Event>(
      `${this.apiUrl}/${eventId}/status`,
      {},
      { params: { status } }
    ).pipe(
      tap(() => this.clearCache(eventId))
    );
  }

  deleteEvent(eventId: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.apiUrl}/event/${eventId}`, { headers })
    .pipe(
      tap(() => this.clearCache(eventId))
    );
  }

  addLink(data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/link/add-link`, data, { headers })
    .pipe(
      tap(() => this.clearLinkCache())
    );;
  }

  updateLink(linkId: number, data: any): Observable<any> {
    console.log("updateLink data :: ", data);
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.apiUrl}/link/edit-link/${linkId}`, data, { headers })
    .pipe(
      tap(() => this.clearLinkCache())
    );;
  }

  // getLink(): Observable<any> {
  //   const headers = this.getAuthHeaders();
  //   return this.http.get<any>(`${this.apiUrl}/link/get-links`, { headers })
  // }
  getLink(): Observable<any> {
    return this.refresh$.pipe(
      startWith(void 0), // première exécution
      switchMap(() => {
        if (!this.linkCache$) {
          console.log('LINK API CALL');
          const headers = this.getAuthHeaders();

          this.linkCache$ = this.http
            .get<any>(`${this.apiUrl}/link/get-links`, { headers })
            .pipe(shareReplay(1));
        }
        console.log('CACHE LINK CALL');
        return this.linkCache$;
      })
    );
  }

  getLinkById(linkId: number): Observable<any> {
    return this.refresh$.pipe(
      startWith(void 0),
      switchMap(() => {
        if (!this.linkCache$) {
          console.log('LINK API CALL');
          const headers = this.getAuthHeaders();

          this.linkCache$ = this.http
            .get<any>(`${this.apiUrl}/link/${linkId}`, { headers })
            .pipe(shareReplay(1));
        }
        console.log('CACHE LINK CALL');
        return this.linkCache$;
      })
    );
  }

  deleteLink(linkId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/link/delete-link/${linkId}`, { headers })
    .pipe(
      tap(() => this.clearLinkCache())
    );;
  }

  getUserByToken(token: string): Observable<any> {
    console.log("[getUserByToken] token :: ",token);
    return this.http.get<any>(`${this.apiUrl}/link/user-role/${token}`);
  }

  clearLinkCache() {
    console.log('CLEAR LINK CACHE');
    this.linkCache$ = undefined;
  }
}
