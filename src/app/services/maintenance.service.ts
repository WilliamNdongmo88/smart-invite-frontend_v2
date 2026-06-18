import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface Maintenance {
  id?: number;
  maintenance_progress: number;
  subscribed: boolean;
  estimated_time: string;
  email: string;
  status: string;
  createdAt?: string;
  lastUpdate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  private apiUrl: string | undefined;
  private isProd = environment.production;
    constructor(private http: HttpClient) { 
        if (this.isProd) {
        this.apiUrl = environment.apiUrlProd;
        } else {
        this.apiUrl = environment.apiUrlDev;
        }
    }

  getMaintenance(): Observable<Maintenance> {
    return this.http.get<Maintenance>(`${this.apiUrl}/maintenance`);
  }

  updateMaintenance(id: number, data: Partial<any>): Observable<any> {
    console.log('Updating maintenance with data:', data);
    return this.http.put(`${this.apiUrl}/maintenance/${id}`, data);
  }

  restart(): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/maintenance/restart`,
      {} // body obligatoire
    );
  }

  send(notification: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/maintenance/notification/send`,
      notification
    );
  }
}
