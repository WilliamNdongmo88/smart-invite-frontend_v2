import { Injectable } from "@angular/core";
import { environment } from "../../environment/environment";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class QrCodeService {
  private apiUrl: string | undefined;
  private isProd = environment.production;

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

  generateQRCode(id: number): Observable<any>{
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/invitation/generate/${id}`, { headers });
  }

  generateSeveralQRCode(idList: number[]): Observable<any>{
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/invitation/generate-several`, idList, { headers });
  }

  viewQrCode(token: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/invitation/qrcode/view/${token}`, { headers });
  }

  downloadQrCode(guestId: number, qrUrl: string) {
    if (!qrUrl) {
      console.error("QR Code URL manquante pour le téléchargement.");
      return;
    }

    const downloadUrl = `${this.apiUrl}/invitation/download/${guestId}?url=${encodeURIComponent(qrUrl)}`;
    console.log("Download URL:", downloadUrl);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `qr-code-invitation-${guestId}.png`;
    link.click();
  }

  downloadGuestsPdf(data: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/event/guest-pdf`, data, {responseType: 'blob'});
  }

  viewPdfs(qrCode: string): Observable<Blob> {
    const data = { link: qrCode };
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/checkin/pdf`, data, { headers, responseType: 'blob'});
  }

  addCheckIn(data: any): Observable<any>{
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/checkin/scan`, data, { headers });
  }

  createCheckInParam(data: any): Observable<any>{
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/checkin-param`, data, { headers });
  }

  getCheckInParam(eventId: number): Observable<any>{
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/checkin-param/${eventId}`, { headers });
  }

  getListScannedGuests(guestIds: number[]): Observable<any> {
    console.log("GuestIds envoyés :", guestIds);
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/checkin/scanned-guest`, { guestIds }, { headers });
  }

  sendThankMessage(datas: any): Observable<any>{
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/checkin/thank-message`, { datas }, { headers });
  }

  updateCheckInParam(data: any): Observable<any>{
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.apiUrl}/checkin-param`, data, { headers });
  }
}