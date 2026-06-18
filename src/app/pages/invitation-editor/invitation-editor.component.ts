import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface InvitationData {
  // Informations de l'événement
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventCivilLocation: string;
  religiousLocation?: string;
  religiousTime?: string;
  showReligiousCeremony: boolean;
  banquetTime: string;

  // Personnes concernées
  nameConcerned1: string;
  nameConcerned2: string;

  // Contenu personnalisé
  mainMessage: string;
  eventTheme: string;
  priorityColors: string;
  qrInstructions: string;
  dressCodeMessage: string;
  thanksMessage1: string;
  thanksMessage2: string;
  closingMessage: string;

  // Couleurs et design
  titleColor: string;
  topBandColor: string;
  bottomBandColor: string;
  textColor: string;

  // Logo et images
  logoUrl?: string;
  heartIconUrl?: string;
}

@Component({
  selector: 'app-invitation-editor-complete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'invitation-editor.component.html',
  styleUrl: 'invitation-editor.component.scss'
})
export class InvitationEditorComponent implements OnInit {
  invitationData: InvitationData = {
    eventName: 'Mariage de Sophie et Pierre',
    eventDate: '2025-06-15',
    eventTime: '14:00',
    eventLocation: 'Palais de Fête, Bafoussam',
    eventCivilLocation: 'Mairie de Bangangte',
    religiousLocation: 'Cathédrale Notre-Dame',
    religiousTime: '15:30',
    showReligiousCeremony: true,
    banquetTime: '19:00',
    nameConcerned1: 'Sophie',
    nameConcerned2: 'Pierre',
    mainMessage: 'C\'est avec un immense bonheur que nous vous invitons à l\'occasion de notre union que nous célebrerons entourés de nos familles, amis et connaissances dans la ville de BANGANGTE plus précisement à la Mairie.',
    eventTheme: 'CHIC ET GLAMOUR',
    priorityColors: 'Bleu, Blanc, Rouge, (NOIR: couleur universelle)',
    qrInstructions: 'Prière de vous présenter uniquement avec votre code QR et votre billet numérique (à partir de votre téléphone) transféré par votre émetteur via les applications mobiles de votre choix (WhatsApp, SMS, e-mail) le jour de la soirée.',
    dressCodeMessage: 'Merci de respecter les couleurs vestimentaires choisies.',
    thanksMessage1: 'Merci de respecter les couleurs vestimentaires choisies.',
    thanksMessage2: 'Merci pour votre compréhension.',
    closingMessage: 'Votre présence illuminera ce jour si spécial pour nous.',
    titleColor: '#b58b63',
    textColor: '#444444',
    topBandColor: '#0055A4',
    bottomBandColor: '#EF4135',
    logoUrl: 'https://via.placeholder.com/65',
    heartIconUrl: 'https://via.placeholder.com/16',
  };

  constructor() {}

  ngOnInit() {}

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  generatePDF() {
    console.log('PDF généré avec les données:', this.invitationData);
    alert('Génération du PDF en cours...');
    // Appeler le service backend pour générer le PDF avec la méthode generateGuestPdf
  }

  resetForm() {
    this.invitationData = {
      eventName: '',
      eventDate: '',
      eventTime: '',
      eventLocation: '',
      eventCivilLocation: '',
      religiousLocation: '',
      religiousTime: '',
      showReligiousCeremony: false,
      banquetTime: '',
      nameConcerned1: '',
      nameConcerned2: '',
      mainMessage: '',
      eventTheme: '',
      priorityColors: '',
      qrInstructions: '',
      dressCodeMessage: '',
      thanksMessage1: '',
      thanksMessage2: '',
      closingMessage: '',
      titleColor: '#b58b63',
      textColor: '#444444',
      topBandColor: '#0055A4',
      bottomBandColor: '#EF4135',
      logoUrl: '',
      heartIconUrl: '',
    };
  }
}
