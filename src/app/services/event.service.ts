import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
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

  // FIX: cache Map pour getEvents (commenté dans l'original) conservé désactivé
  private cache = new Map<number, Observable<{ events: Event[] }>>();
  private cachedEvent = new Map<number, Observable<Event[]>>();

  // FIX: deux caches séparés pour getLink() et getLinkById()
  // (l'original utilisait un seul linkCache$ pour deux endpoints différents → corruption de cache)
  private linkCache$?: Observable<any>;
  private linkByIdCache$ = new Map<number, Observable<any>>();

  // FIX: refresh$ supprimé (jamais utilisé via .next() dans l'original)
  // FIX: linksSubject/links$ supprimés (dead code, jamais alimentés)
  // FIX: cachedEventInvtNote supprimé (dead code, jamais utilisé)

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

  getEventById(eventId: number): Observable<Event[]> {
    if (this.cachedEvent.has(eventId)) {
      return this.cachedEvent.get(eventId)!;
    }

    const request$ = this.http
      .get<Event[]>(`${this.apiUrl}/event/${eventId}`)
      .pipe(shareReplay(1));

    this.cachedEvent.set(eventId, request$);
    return request$;
  }

  getEventInvitNote(eventId: number): Observable<any> {
    return this.http.get<Event[]>(`${this.apiUrl}/event/event-inv-note/${eventId}`);
  }

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
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/event/create-event`, request, { headers })
    .pipe(
      tap(() => this.clearCache())
    );
  }

  createEventWihtFile(formData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/file/create-event-file`, formData);
  }

  updateEventWihtFile(eventId: number, formData: any): Observable<any> {
    return this.http
      .put<any>(`${this.apiUrl}/file/update-event-file/${eventId}`, formData);
  }

  updateEvent(eventId: number, request: Partial<any>): Observable<Event> {
    const headers = this.getAuthHeaders();
    return this.http
    .put<Event>(`${this.apiUrl}/event/${eventId}`, request, { headers })
    .pipe(
      tap(() => this.clearCache(eventId))
    );
  }

  // FIX: URL corrigée : ajout du segment /event/ manquant
  updateEventStatus(eventId: number, status: string): Observable<Event> {
    return this.http.patch<Event>(
      `${this.apiUrl}/event/${eventId}/status`,
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
    );
  }

  updateLink(linkId: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.apiUrl}/link/edit-link/${linkId}`, data, { headers })
    .pipe(
      tap(() => this.clearLinkCache())
    );
  }

  // FIX: cache dédié à l'endpoint /get-links uniquement
  getLink(): Observable<any> {
    if (!this.linkCache$) {
      const headers = this.getAuthHeaders();
      this.linkCache$ = this.http
        .get<any>(`${this.apiUrl}/link/get-links`, { headers })
        .pipe(shareReplay(1));
    }
    return this.linkCache$;
  }

  // FIX: cache Map par linkId, séparé de linkCache$ (l'original partageait un seul cache
  // entre deux endpoints différents → getLinkById(5) puis getLink() retournait /link/5)
  getLinkById(linkId: number): Observable<any> {
    if (!this.linkByIdCache$.has(linkId)) {
      const headers = this.getAuthHeaders();
      this.linkByIdCache$.set(
        linkId,
        this.http
          .get<any>(`${this.apiUrl}/link/${linkId}`, { headers })
          .pipe(shareReplay(1))
      );
    }
    return this.linkByIdCache$.get(linkId)!;
  }

  deleteLink(linkId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/link/delete-link/${linkId}`, { headers })
    .pipe(
      tap(() => this.clearLinkCache())
    );
  }

  getUserByToken(token: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/link/user-role/${token}`);
  }

  // FIX: vide également linkByIdCache$ (l'original ne le faisait pas)
  clearLinkCache() {
    this.linkCache$ = undefined;
    this.linkByIdCache$.clear();
  }
}
