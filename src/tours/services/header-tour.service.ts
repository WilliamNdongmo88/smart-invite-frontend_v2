import { Injectable } from '@angular/core';
import Shepherd from 'shepherd.js';

const TOTAL = 1;

function progress(step: number, total: number): string {
  const pct = Math.round((step / total) * 100);
  return `
    <div class="tour-progress">
      <span class="tour-step-badge">Étape ${step} / ${total}</span>
      <div class="tour-progress-bar">
        <div class="tour-progress-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
}

@Injectable({ providedIn: 'root' })
export class HeaderTourService {

  private tour!: any;

  initTour(): void {

    this.tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        arrow: true,
        scrollTo: { behavior: 'smooth', block: 'center' },
        classes: 'smart-tour-step'
      }
    });

    this.tour.addStep({
      id: 'scanner',
      title: 'Scanner les invitations',
      text: `${progress(1, TOTAL)}<p class="tour-description">Accédez au scanner pour lire les QR Codes des invitations. Cette fonctionnalité permet de confirmer rapidement la présence des invités et de faciliter leur accueil lors de l'événement.</p>`,
      attachTo: { element: '#menu-scanner', on: 'bottom' },
      showOn: () => !!document.querySelector('#menu-scanner'),
      buttons: [
        { text: 'Terminer', action: () => this.tour.complete() }
      ]
    });
  }

  start(): void {
    this.tour.start();
  }

  getTour(): any {
    return this.tour;
  }
}
