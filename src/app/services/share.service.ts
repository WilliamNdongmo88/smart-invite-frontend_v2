import { Injectable } from "@angular/core";
import { Subject, BehaviorSubject, ReplaySubject } from "rxjs";

@Injectable({ providedIn: 'root' })
export class CommunicationService {
  private messageSource = new BehaviorSubject<any>("");
  message$ = this.messageSource.asObservable();

  private requestSource = new Subject<any>();
  request$ = this.requestSource.asObservable();

  private responseSource = new Subject<boolean>();
  response$ = this.responseSource.asObservable();

  sendRequest(data: any) {
    this.requestSource.next(data);
  }

  sendResponse(result: boolean) {
    this.responseSource.next(result);
  }

  sendMessage(variable: any) {
    localStorage.setItem('variable', variable);
    this.messageSource.next(variable);
  }

  // Pour déclencher une action chez le Sender
  // FIX: ReplaySubject(1) au lieu de Subject → les composants qui s'abonnent après
  // l'émission reçoivent quand même la dernière valeur (évite les signaux perdus)
  private triggerActionSource = new ReplaySubject<any>(1);
  triggerAction$ = this.triggerActionSource.asObservable();

  // Appelé par Receiver pour dire "Sender exécute ta méthode"
  triggerSenderAction(action: any) {
    this.triggerActionSource.next(action);
  }
}
