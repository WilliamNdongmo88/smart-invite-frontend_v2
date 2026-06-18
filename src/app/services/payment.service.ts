import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = environment.production ? environment.apiUrlProd : environment.apiUrlDev;
  }

  calculateAmount(quota: number): Observable<{ quota: number; amount: number; currency: string }> {
    return this.http.get<any>(`${this.apiUrl}/payment/calculate`, {
      params: { quota: String(quota) }
    });
  }

  // Initialiser un paiement (sans preuve encore)
  initEventPayment(eventId: number, quota: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payment/event`, { eventId, quota });
  }

  // Soumettre la preuve de paiement
  submitPaymentProof(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payment/event/proof`, formData);
  }

  // Récupérer tous les paiements d'un événement
  getAllPayments(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/payment/history`);
  }

  // Récupérer le paiement d'un événement
  getEventPayment(eventId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/payment/event/${eventId}`);
  }

  // Admin uniquement
  getPendingPayments(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/payment/pending`);
  }

  markUnderReview(paymentId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/payment/${paymentId}/review`, {});
  }

  validatePayment(paymentId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/payment/${paymentId}/validate`, {});
  }

  rejectPayment(paymentId: number, reason: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/payment/${paymentId}/reject`, { reason });
  }
}