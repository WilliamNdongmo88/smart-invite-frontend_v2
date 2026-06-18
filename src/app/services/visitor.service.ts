import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../environment/environment';

export interface VisitorRow {
  id: number;
  visitor_id: string;
  ip_address: string;
  country: string;
  city: string;
  region: string;
  timezone: string;
  language: string;
  device: string;
  os: string;
  browser: string;
  first_visit: string;
  last_visit: string;
  total_visits: number;
  total_pages: number;
  is_returning: boolean;
  // session fields (joined)
  session_id?: string;
  duration?: number;
  session_pages?: number;
  session_date?: string;
}

export interface VisitorDetail {
  visitor: VisitorRow;
  sessions: VisitorSession[];
  pageViews: VisitorPageView[];
}

export interface VisitorSession {
  id: number;
  visitor_id: string;
  session_id: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  pages_count: number;
}

export interface VisitorPageView {
  id: number;
  session_id: string;
  page_url: string;
  referrer: string;
  visit_time: string;
}

export interface VisitorStats {
  total_visitors: number;
  total_sessions: number;
  total_pages: number;
  avg_duration: number;
  returning_count: number;
  returning_rate: number;
  byCountry: { country: string; count: number }[];
  byCity:    { city: string; count: number }[];
  byBrowser: { browser: string; count: number }[];
  byOS:      { os: string; count: number }[];
  byDevice:  { device: string; count: number }[];
  byDay:     { day: string; count: number }[];
  byWeek:    { week: string; count: number }[];
  byMonth:   { month: string; count: number }[];
  topPages:  { page_url: string; count: number }[];
}

const EXCLUDED_ROUTES = ['/admin', '/dashboard', '/evenements', '/login', '/signup', '/profile', '/settings', '/activate-account'];
const COOKIE_NAME     = 'si_visitor_id';
const SESSION_KEY     = 'si_session_id';
const COOKIE_DAYS     = 365;

@Injectable({ providedIn: 'root' })
export class VisitorService {
  private readonly apiUrl: string;
  private visitorId!: string;
  private sessionId!: string;
  private startTime = 0;

  constructor(private http: HttpClient, private router: Router) {
    const base = environment.production ? environment.apiUrlProd : environment.apiUrlDev;
    this.apiUrl = `${base}/visitors`;
  }

  init(): void {
    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.getOrCreateSessionId();

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url: string = e.urlAfterRedirects;
        if (this.isExcluded(url)) return;

        if (this.startTime === 0) {
          // Première page : démarrer la session
          this.startTime = Date.now();
          this.sendStart(url);
        } else {
          // Navigation : enregistrer la page vue
          this.sendPageView(url);
        }
      });

    window.addEventListener('beforeunload', () => this.sendEndSession());
  }

  private sendStart(pageUrl: string): void {
    const payload = {
      visitorId:  this.visitorId,
      sessionId:  this.sessionId,
      language:   navigator.language || 'unknown',
      device:     this.detectDevice(),
      os:         this.detectOS(),
      browser:    this.detectBrowser(),
      timezone:   Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    };
    this.http.post(`${this.apiUrl}/start`, payload).subscribe({
      next: () => this.sendPageView(pageUrl),
      error: () => {}
    });
  }

  private sendPageView(pageUrl: string): void {
    const payload = { sessionId: this.sessionId, pageUrl, referrer: document.referrer || '' };
    this.http.post(`${this.apiUrl}/page-view`, payload).subscribe({ error: () => {} });
  }

  private sendEndSession(): void {
    const duration = this.startTime > 0 ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    const blob = new Blob(
      [JSON.stringify({ sessionId: this.sessionId, duration })],
      { type: 'application/json' }
    );
    const base = environment.production ? environment.apiUrlProd : environment.apiUrlDev;
    navigator.sendBeacon(`${base}/visitors/end-session`, blob);
  }

  private isExcluded(url: string): boolean {
    return EXCLUDED_ROUTES.some(r => url === r || url.startsWith(r + '/'));
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  getAllVisitors(params: { search?: string; country?: string; city?: string; device?: string; browser?: string; dateFrom?: string; dateTo?: string } = {}) {
    return this.http.get<{ visitors: VisitorRow[] }>(this.apiUrl, { params: params as any });
  }

  getVisitorDetail(visitorId: string) {
    return this.http.get<VisitorDetail>(`${this.apiUrl}/${visitorId}`);
  }

  getStats() {
    return this.http.get<VisitorStats>(`${this.apiUrl}/stats`);
  }

  getPublicStats() {
    return this.http.get<{ total_visitors: number; total_users: number }>(`${this.apiUrl}/public-stats`);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private getOrCreateVisitorId(): string {
    let id = this.getCookie(COOKIE_NAME);
    if (!id) {
      id = this.uuid();
      this.setCookie(COOKIE_NAME, id, COOKIE_DAYS);
    }
    return id;
  }

  private getOrCreateSessionId(): string {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = this.uuid();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  private uuid(): string {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now();
  }

  private getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? match[1] : null;
  }

  private setCookie(name: string, value: string, days: number): void {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
  }

  private detectDevice(): string {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'Mobile';
    return 'Desktop';
  }

  private detectOS(): string {
    const ua = navigator.userAgent;
    if (/windows/i.test(ua))           return 'Windows';
    if (/mac os/i.test(ua))            return 'macOS';
    if (/android/i.test(ua))           return 'Android';
    if (/iphone|ipad|ipod/i.test(ua))  return 'iOS';
    if (/linux/i.test(ua))             return 'Linux';
    return 'unknown';
  }

  private detectBrowser(): string {
    const ua = navigator.userAgent;
    if (/edg\//i.test(ua))         return 'Edge';
    if (/opr\//i.test(ua))         return 'Opera';
    if (/chrome/i.test(ua))        return 'Chrome';
    if (/safari/i.test(ua))        return 'Safari';
    if (/firefox/i.test(ua))       return 'Firefox';
    if (/msie|trident/i.test(ua))  return 'IE';
    return 'unknown';
  }
}
