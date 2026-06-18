import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
    private apiUrl: string | undefined;
    private isProd = environment.production;

    constructor(
        private http: HttpClient, 
    ) {
        if (this.isProd) {
        this.apiUrl = environment.apiUrlProd;
        } else {
        this.apiUrl = environment.apiUrlDev;
        }
    }

  createFeedback(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/feedback`, data);
  }

  getFeedbackStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/feedback/stats`);
  }

  getRecentFeedback(): Observable<any> {
    return this.http.get(`${this.apiUrl}/feedback/recent`);
  }

  putRecentFeedback(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/feedback/${id}`, data);
  }

  getAllUsers(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/feedback-users`, data);
  }
}
