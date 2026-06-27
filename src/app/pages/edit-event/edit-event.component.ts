import { Component, signal, OnInit, PipeTransform, Pipe, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CreateEventRequest, EventService } from '../../services/event.service';
import { N } from '@angular/cdk/keycodes';
import { SpinnerComponent } from "../../components/spinner/spinner";
import { ErrorModalComponent } from "../../components/error-modal/error-modal";
import { ConfirmDeleteModalComponent } from "../../components/confirm-delete-modal/confirm-delete-modal";
import { CommunicationService } from '../../services/share.service';
import { DomSanitizer } from '@angular/platform-browser';
import { NavigationService } from '../../services/navigationService ';
import { PRICE_PER_GUEST } from '../pricing/pricing.component';
import { PaymentService } from '../../services/payment.service';
import { Location } from '@angular/common';
interface InvitationData {
  title: string;
  eventDate: string;
  eventLocation: string;
  eventTime: string;
  mainMessage: string;
  mainMessagePart1?: string;
  mainMessagePart2?: string;
  eventTheme: string;
  priorityColors: string;
  qrInstructions: string;
  dressCodeMessage: string;
  thanksMessage1: string;
  sousMainMessage: string;
  closingMessage: string;

  // Couleurs et design
  titleColor: string;
  topBandColor: string;
  bottomBandColor: string;
  textColor: string;

  pdfUrl?: string;
  hasInvitationModelCard?: boolean;
  logoUrl?: string;
  heartIconUrl?: string;
}

interface Event {
  id: string;
  organizerId?: number;
  title: string;
  date: string;
  time: string;
  banquetTime: string;
  religiousLocation: string,
  religiousTime: string,
  civilLocation: string;
  location: string;
  description: string;
  totalGuests: number;
  budget?: number;
  type: string;
  eventNameConcerned1?: string;
  eventNameConcerned2?: string;
  allowDietaryRestrictions?: boolean;
  showWeddingReligiousLocation?: boolean;
  allowPlusOne?: boolean;
  status: 'planned' | 'active' | 'completed' | 'canceled';
  createdAt?: string;
  updatedAt?: string;
}
@Pipe({ name: 'safe', standalone: true })
export class SafePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(url: any) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}@Component({
  selector: 'app-edit-event',
  standalone: true,
  imports: [CommonModule, FormsModule,
    SpinnerComponent, ErrorModalComponent,
    ConfirmDeleteModalComponent, SafePipe],
  templateUrl: 'edit-event.component.html',
  styleUrl: 'edit-event.component.scss'
})
export class EditEventComponent implements OnInit {
  currentStep = signal(1);
  eventId: number = 0;

  originalQuota = 0;
  quotaChanged = false;
  calculatedAmount = 0;
  validatedQuota = 0;   // quota déjà validé et payé pour cet événement
  amountDue = 0;        // montant réellement dû = delta × PRICE_PER_GUEST
  PRICE_PER_GUEST = PRICE_PER_GUEST;

  errorMessage: string = '';
  isLoading: boolean = false;
  showErrorModal = false;
  showDeleteModal = false;
  modalAction: string | undefined;
  warningMessage: string = "";
  showWeddingNames = false;
  showEngagementNames = false;
  showAnniversaryNames = false;
  showBirthdayNames = false;
  showAnother = false;
  newFile = false;
  showWeddingCivilLocation = false;
  showWeddingReligiousLocation = false;
  hasInvitationModelCard = false;
  isDefaultPdfUrl = false;
  defaultPdfUrl = 'pdfs/default_invitation_card.pdf';
  selectedPdfFile: File | null = null; // Pour stocker le fichier réel
  pdfModelUrl: string | null = null;   // Pour l'aperçu (base64)

  originalEventData: Event = {
      id: '',
      title: '',
      date: '',
      time: '',
      banquetTime: '',
      religiousLocation: '',
      religiousTime: '',
      civilLocation: '',
      location: '',
      description: '',
      totalGuests: 0,
      type: '',
      budget: 0,
      eventNameConcerned1: '',
      eventNameConcerned2: '',
      allowDietaryRestrictions: true,
      showWeddingReligiousLocation: false,
      allowPlusOne: true,
      status: 'planned'
  };

  eventData: Event = { ...this.originalEventData };

  baseInvitationData: Partial<InvitationData> = {
    priorityColors: 'Bleu, Blanc, Rouge, Noir',
    qrInstructions: 'Prière de vous présenter uniquement avec votre code QR pour faciliter votre accueil.',
    dressCodeMessage: 'Merci de respecter les couleurs vestimentaires choisies.',
    thanksMessage1: 'Merci pour votre compréhension.',
    titleColor: '#b58b63',
    topBandColor: '#0055A4',
    bottomBandColor: '#EF4135',
    textColor: '#444444',
    logoUrl: 'img/logo.png',
    heartIconUrl: 'img/heart.png'
  };

  /**
   * MODÈLES OFFICIELS D'INVITATION
   * Source unique de vérité pour les textes par défaut de chaque type d'événement.
   * Ces valeurs servent uniquement d'initialisation — elles ne surchargent jamais
   * les modifications saisies par l'utilisateur (voir applyTemplate()).
   */
  invitationTemplates: Record<string, Partial<InvitationData>> = {
    wedding: {
      title: "LETTRE D'INVITATION",
      mainMessage:
        "C'est avec un immense bonheur que nous vous invitons à célébrer notre union. Votre présence à nos côtés rendra cette journée inoubliable.",
      eventTheme: "CHIC ET GLAMOUR",
      sousMainMessage:
        "Mini réception à la sortie de la mairie directement après la célébration de l'union par Mr le Maire.",
      closingMessage:
        "Votre présence illuminera ce jour si spécial pour nous.",
      qrInstructions:
        "Prière de vous présenter avec votre code QR afin de faciliter votre accueil.",
      dressCodeMessage:
        "Merci de respecter les couleurs vestimentaires choisies.",
      thanksMessage1:
        "Merci pour votre compréhension et votre présence à nos côtés."
    },

    engagement: {
      title: "LETTRE D'INVITATION",
      mainMessage:
        "C'est avec une immense joie que nous vous convions à la célébration de nos fiançailles. Ce moment symbolique marque le début d'une belle aventure que nous souhaitons partager avec nos proches.",
      eventTheme: "ÉLÉGANCE ET TRADITION",
      // sousMainMessage décrit le cocktail/réception — affiché dans le programme
      sousMainMessage:
        "Échange des engagements et bénédictions des familles. Moment de convivialité, animations et partage autour d'un repas festif.",
      closingMessage:
        "Votre présence rendra cette étape de notre vie encore plus mémorable.",
      qrInstructions:
        "Prière de vous présenter avec votre code QR afin de faciliter votre accueil.",
      dressCodeMessage:
        "Merci de respecter les couleurs vestimentaires choisies.",
      thanksMessage1:
        "Nous vous remercions par avance pour votre présence et votre affection."
    },

    anniversary: {
      title: "LETTRE D'INVITATION",
      mainMessage:
        "Après de nombreuses années de bonheur partagé, nous avons le plaisir de vous inviter à célébrer notre anniversaire de mariage. Votre présence contribuera à faire de cette journée un souvenir précieux.",
      eventTheme: "AMOUR ET SOUVENIRS",
      // sousMainMessage décrit la réception festive
      sousMainMessage:
        "Moment de reconnaissance, de gratitude et de renouvellement de nos engagements. Repas, animations, souvenirs et moments de partage avec nos proches.",
      closingMessage:
        "Votre présence sera le plus beau des cadeaux.",
      qrInstructions:
        "Prière de vous présenter avec votre code QR pour faciliter votre accueil.",
      dressCodeMessage:
        "Merci de partager avec nous cette étape importante de notre histoire.",
      thanksMessage1:
        "Merci pour votre présence et votre fidèle amitié."
    },

    birthday: {
      title: "LETTRE D'INVITATION",
      mainMessage:
        "À l'occasion de cet anniversaire, j'ai le plaisir de vous inviter à partager un moment de joie, de fête et de bonne humeur.",
      eventTheme: "FÊTE ET JOIE",
      // sousMainMessage décrit la célébration
      sousMainMessage:
        "Animations, jeux, musique, séance photo et découpe du gâteau. Repas, divertissements et moments de convivialité.",
      closingMessage:
        "Nous espérons partager cette journée exceptionnelle en votre compagnie.",
      qrInstructions:
        "Prière de vous présenter avec votre code QR pour faciliter votre accueil.",
      dressCodeMessage:
        "Dress Code (facultatif) : selon les indications de l'hôte.",
      thanksMessage1:
        "Merci d'avance pour votre présence."
    },

    other: {
      title: "LETTRE D'INVITATION",
      mainMessage:
        "Nous avons le plaisir de vous inviter à participer à cet événement. Votre présence contribuera au succès et à la convivialité de cette occasion particulière.",
      mainMessagePart1: "Nous avons le plaisir de vous inviter à participer à l'événement :",
      mainMessagePart2: "Votre présence contribuera au succès et à la convivialité de cette occasion particulière.",
      eventTheme: "CÉLÉBRATION",
      // sousMainMessage décrit le déroulement
      sousMainMessage:
        "Déroulement de l'événement selon le programme prévu. Moment de partage et d'échanges entre les participants.",
      closingMessage:
        "Nous vous remercions pour votre confiance et espérons vous compter parmi nous lors de cette occasion spéciale. Au plaisir de vous accueillir.",
      qrInstructions:
        "Prière de vous présenter avec votre code QR afin de faciliter votre accueil.",
      dressCodeMessage:
        "Informations complémentaires selon les indications de l'organisateur.",
      thanksMessage1:
        "Merci pour votre présence et votre confiance."
    }
  };

  /**
   * PROGRAMMES PAR TYPE D'ÉVÉNEMENT
   * Structure le programme affiché dans l'aperçu de l'invitation.
   * Chaque item utilise des clés de champ (timeField, locationField, etc.)
   * résolues dynamiquement via getInvitationValue().
   */
  programTemplates: Record<string, any[]> = {
    wedding: [
      {
        title: 'MARIAGE CIVIL',
        timeField: 'eventTime',
        locationField: 'eventCivilLocation',
        descriptionField: 'sousMainMessage'
      },
      {
        title: 'CÉRÉMONIE RELIGIEUSE',
        timeField: 'religiousTime',
        locationField: 'religiousLocation',
        conditionField: 'showReligiousCeremony'
      },
      {
        title: 'RÉCEPTION NUPTIALE',
        timeField: 'banquetTime',
        locationField: 'eventLocation'
      }
    ],

    engagement: [
      {
        title: 'CÉRÉMONIE DE FIANÇAILLES',
        timeField: 'eventTime',
        locationField: 'eventLocation'
      },
      {
        // title: 'COCKTAIL ET RÉCEPTION',
        // timeField: 'banquetTime',
        // locationField: 'eventLocation',
        descriptionField: 'sousMainMessage'
      }
    ],

    anniversary: [
      {
        title: 'CÉRÉMONIE COMMÉMORATIVE',
        timeField: 'eventTime',
        locationField: 'eventLocation'
      },
      {
        // title: 'RÉCEPTION FESTIVE',
        // timeField: 'banquetTime',
        // locationField: 'eventLocation',
        descriptionField: 'sousMainMessage'
      }
    ],

    birthday: [
      {
        title: 'ACCUEIL DES INVITÉS',
        timeField: 'eventTime',
        locationField: 'eventLocation'
      },
      {
        title: 'CÉLÉBRATION D\'ANNIVERSAIRE',
        descriptionField: 'sousMainMessage'
      }
    ],

    other: [
      {
        title: 'OUVERTURE ET ACCUEIL',
        timeField: 'eventTime',
        locationField: 'eventLocation'
      },
      {
        title: 'DÉROULEMENT DE L\'ÉVÉNEMENT',
        descriptionField: 'sousMainMessage'
      },
      // {
      //   title: 'CLÔTURE / RÉCEPTION',
      //   timeField: 'banquetTime'
      // }
    ]
  };

  selectedEventType = 'wedding';

  invitationData: InvitationData = {
    ...this.baseInvitationData,
    ...this.invitationTemplates[this.selectedEventType]
  } as InvitationData;

  current_program: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
    private paymentService: PaymentService,
    private navigationService: NavigationService,
    private communicationService: CommunicationService,
    private router: Router,
    private location: Location,
    private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.eventId = Number(params['eventId']);
      //console.log('Édition de l\'événement avec ID :', this.eventId);
      // Charger l'événement depuis le backend
      this.loadEvent();
      this.loadValidatedQuota();
    });
  }

  loadEvent() {
    this.eventService.getEventById(this.eventId).subscribe(
    (response) => {
        console.log("#Response :: ", response);
        const res = response[0];

        if (!res?.event_date) {
          console.error('event_date manquant');
          return;
        }

        const eventDate = new Date(res.event_date);

        if (isNaN(eventDate.getTime())) {
          console.error('Format de date invalide:', res.event_date);
          return;
        }

        const date = eventDate.toISOString().split('T')[0];

        const time = eventDate.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC'
        });

        if(res.type=='wedding'){
          this.showWeddingCivilLocation = true;
          this.showWeddingNames = true;
          this.showEngagementNames = false;
          this.showAnniversaryNames = false;
          this.showBirthdayNames = false;
          this.showAnother = false;
        } else if(res.type=='engagement'){
          this.showWeddingCivilLocation = false;
          this.showEngagementNames = true;
          this.showWeddingNames = false;
          this.showAnniversaryNames = false;
          this.showBirthdayNames = false;
          this.showAnother = false;
        } else if(res.type=='anniversary'){
          this.showWeddingCivilLocation = false;
          this.showAnniversaryNames = true;
          this.showWeddingNames = false;
          this.showEngagementNames = false;
          this.showBirthdayNames = false;
          this.showAnother = false;
        } else if(res.type=='birthday'){
          this.showWeddingCivilLocation = false;
          this.showBirthdayNames = true;
          this.showWeddingNames = false;
          this.showEngagementNames = false;
          this.showAnniversaryNames = false;
          this.showAnother = false;
        } else {
          this.showWeddingCivilLocation = false;
          this.showAnother = true;
          this.showWeddingNames = false;
          this.showEngagementNames = false;
          this.showAnniversaryNames = false;
          this.showBirthdayNames = false;
        }
        const banquetTime1 = res.banquet_time.split(":")[0]
        const banquetTime2 = res.banquet_time.split(":")[1].split(':')[0];
        const banquetTime = banquetTime1+':'+banquetTime2;
        this.originalEventData = {
            id: Number(res.event_id).toString(),
            organizerId: res.organizer_id,
            title: res.title,
            date: date,
            time: time,
            banquetTime: banquetTime,
            religiousLocation: res.religious_location,
            religiousTime: res.religious_time.split(":00")[0],
            civilLocation: res.event_civil_location,
            location: res.event_location,
            description: res.description,
            totalGuests: res.max_guests,
            budget: res.budget,
            type: res.type,
            allowDietaryRestrictions: res.foot_restriction,
            showWeddingReligiousLocation: res.show_wedding_religious_location,
            eventNameConcerned1: res.event_name_concerned1,
            eventNameConcerned2: res.event_name_concerned2,
            allowPlusOne: res.has_plus_one,
            status: res.status as 'planned' | 'active' | 'completed' | 'canceled',
            createdAt: res.createdAt,
            updatedAt: res.updatedAt,
        };
        this.loadEventInvitationNote();
        this.originalQuota = res.max_guests;
        this.eventData = { ...this.originalEventData };
        //console.log("#this.eventData :: ", this.eventData);
    },
    (error) => {
        // this.loading = false;
        console.error('❌ Erreur de recupération :', error);
        //console.log("Message :: ", error.message);
        this.errorMessage = error.message || 'Erreur de connexion';
    }
    );
  }

  loadEventInvitationNote() {
    this.eventService.getEventInvitNote(this.eventId).subscribe(
    (response) => {
        console.log("#Response :: ", response);
        let time = '';
        if (response?.event_date) {
          const [, timePart] = response.event_date.split('T');
          const [heure, minute] = timePart.split(':');
          time = `${heure}:${minute}`
          console.log('#time :: ', `${heure}:${minute}`);
        }
        this.invitationData = {
          title: response.title ?? this.invitationData.title,
          eventDate: response.event_date ?? this.invitationData.eventDate,
          eventTime: time ?? this.invitationData.eventTime,
          eventLocation: this.eventData.location ?? this.invitationData.eventLocation,
          mainMessage: response.main_message ?? this.invitationData.mainMessage,
          mainMessagePart1: response.mainMessage_part1 ?? this.invitationData.mainMessagePart1,
          mainMessagePart2: response.mainMessage_part2 ?? this.invitationData.mainMessagePart2,
          sousMainMessage:response.sous_main_message ?? this.invitationData.sousMainMessage,
          eventTheme: response.event_theme ?? this.invitationData.eventTheme,
          priorityColors: response.priority_colors ?? this.invitationData.priorityColors,
          qrInstructions: response.qr_instructions ?? this.invitationData.qrInstructions,
          dressCodeMessage: response.dress_code_message ?? this.invitationData.dressCodeMessage,
          thanksMessage1: response.thanks_message1 ?? this.invitationData.thanksMessage1,
          closingMessage: response.closing_message ?? this.invitationData.closingMessage,
          titleColor: response.title_color ?? this.invitationData.titleColor,
          topBandColor: response.top_band_color ?? this.invitationData.topBandColor,
          bottomBandColor: response.bottom_band_color ?? this.invitationData.bottomBandColor,
          textColor: response.text_color ?? this.invitationData.textColor,
          pdfUrl: response.pdf_url ?? null,
          hasInvitationModelCard: response.has_invitation_model_card ?? false,
          logoUrl: response.logo_url ?? this.invitationData.logoUrl,
          heartIconUrl: response.heart_icon_url ?? this.invitationData.heartIconUrl,
        };
        this.hasInvitationModelCard = response.has_invitation_model_card;
        this.isDefaultPdfUrl = response.pdf_url ? true : false;
        //console.log("# response.pdf_url :: ", response.pdf_url);
        // //console.log("# this.isDefaultPdfUrl :: ", this.isDefaultPdfUrl);
        // //console.log("#this.invitationData :: ", this.invitationData);
        // //console.log("#this.hasInvitationModelCard :: ", this.hasInvitationModelCard);
    },
    (error) => {
        // this.loading = false;
        console.error('❌ Erreur de recupération :', error);
        //console.log("Message :: ", error.message);
        this.errorMessage = error.message || 'Erreur de connexion';
    }
    );
  }

  loadValidatedQuota() {
    if (!this.eventId) return;
    this.paymentService.getEventPayment(this.eventId).subscribe({
      next: (res) => {
        console.log("### Res: ", res);
        if (res.payment?.status === 'validated') {
          this.validatedQuota = res.payment.total_validated_quota;
        } else {
          this.validatedQuota = 0;
        }
        this.recalculate();
      },
      error: () => {
        this.validatedQuota = 0;
      }
    });
  }

  onQuotaChange() {
    this.quotaChanged = this.eventData.totalGuests !== this.originalQuota;
    this.recalculate();
  }

  recalculate() {
    const newQuota = this.eventData.totalGuests || 0;
    const delta = newQuota - this.validatedQuota;
    this.amountDue = delta > 0 ? delta * this.PRICE_PER_GUEST : 0;
    // calculatedAmount conservé pour affichage du total brut si besoin
    this.calculatedAmount = newQuota * this.PRICE_PER_GUEST;
  }

  isStepValid(step: number, form: NgForm): boolean {
    if (step === 1) {
      // 🟢 SI le modèle PDF est importé → on ignore les validations
      console.log("this.eventData.type: ", this.eventData.type);
      if (this.hasInvitationModelCard) {
          return !!(
          this.eventData.title &&
          this.eventData.type &&
          this.eventData.date &&
          this.eventData.banquetTime
        );
      }else if (this.eventData.type != 'wedding') {
          return !!(
          this.eventData.title &&
          this.eventData.type &&
          this.eventData.date &&
          this.eventData.time &&
          this.eventData.location
        );
      }

      // 🔴 SINON → validations normales
      return !!(
        this.eventData.title &&
        this.eventData.type &&
        this.eventData.date &&
        this.eventData.time &&
        this.eventData.location &&
        this.eventData.banquetTime
      );
    }else if (step === 2) {
      // 🟢 SI le type anniversaire ou autre → on ignore les validations
      if (this.showBirthdayNames || this.showAnother) {
          return !!(
          this.eventData.eventNameConcerned1 &&
          this.eventData.totalGuests > 0
        );
      }

      // 🔴 SINON → validations normales
      return !!(
        this.eventData.eventNameConcerned1 &&
        this.eventData.eventNameConcerned2 &&
        this.eventData.totalGuests > 0
      );
    }

    return true;
  }

  markStepFieldsAsTouched(form: NgForm) {
    Object.entries(form.controls).forEach(([name, control]) => {
      control.markAsTouched();

      if (control.invalid) {
        console.warn(`❌ Champ invalide: ${name}`, {
          value: control.value,
          errors: control.errors
        });
      }
    });
  }

  nextStep(form: NgForm) {
    if (this.currentStep() < 5) {
      if (this.eventData.type=='wedding') {
        this.showWeddingNames = true;
        this.showEngagementNames = false;
        this.showAnniversaryNames = false;
        this.showBirthdayNames = false;
        this.showAnother = false;
      }
      if (this.eventData.type=='engagement') {
        this.showEngagementNames = true;
        this.showWeddingNames = false;
        this.showAnniversaryNames = false;
        this.showBirthdayNames = false;
        this.showAnother = false;
      }
      if (this.eventData.type=='anniversary') {
        this.showAnniversaryNames = true;
        this.showWeddingNames = false;
        this.showEngagementNames = false;
        this.showBirthdayNames = false;
        this.showAnother = false;
      }
      if (this.eventData.type=='birthday') {
        this.showBirthdayNames = true;
        this.showWeddingNames = false;
        this.showEngagementNames = false;
        this.showAnniversaryNames = false;
        this.showAnother = false;
      }
      if (this.eventData.type=='other') {
        this.showAnother = true;
        this.showWeddingNames = false;
        this.showEngagementNames = false;
        this.showAnniversaryNames = false;
        this.showBirthdayNames = false;
      }
      if(this.currentStep()+1 === 4 &&
        this.invitationData.hasInvitationModelCard && !this.isDefaultPdfUrl &&
        !this.selectedPdfFile){
          this.triggerError();
          this.errorMessage = "Veuillez sélectionner votre modèle PDF.";
          this.currentStep.update(step => step);
          return;
      }
      if (!this.isStepValid(this.currentStep(), form)) {
        //console.log("Form: ", form.controls);
        this.markStepFieldsAsTouched(form);
        return;
      }
      this.currentStep.update(step => step + 1);
    }
  }

  changeStep(form: NgForm, step: number) {
    if (step < 5) {
      //console.log("Step: ", step);
      // //console.log('this.eventData:', this.eventData);
      // //console.log("this.invitationData: ", this.invitationData);
      //console.log("this.isDefaultPdfUrl: ", this.isDefaultPdfUrl);
      //console.log("hasInvitationModelCard: ", this.hasInvitationModelCard);
      if (this.eventData.type=='wedding') {
        this.showWeddingNames = true;
        this.showEngagementNames = false;
        this.showAnniversaryNames = false;
        this.showBirthdayNames = false;
        this.showAnother = false;
      }
      if (this.eventData.type=='engagement') {
        this.showEngagementNames = true;
        this.showWeddingNames = false;
        this.showAnniversaryNames = false;
        this.showBirthdayNames = false;
        this.showAnother = false;
      }
      if (this.eventData.type=='anniversary') {
        this.showAnniversaryNames = true;
        this.showWeddingNames = false;
        this.showEngagementNames = false;
        this.showBirthdayNames = false;
        this.showAnother = false;
      }
      if (this.eventData.type=='birthday') {
        this.showBirthdayNames = true;
        this.showWeddingNames = false;
        this.showEngagementNames = false;
        this.showAnniversaryNames = false;
        this.showAnother = false;
      }
      if (this.eventData.type=='other') {
        this.showAnother = true;
        this.showWeddingNames = false;
        this.showEngagementNames = false;
        this.showAnniversaryNames = false;
        this.showBirthdayNames = false;
      }
      if(step === 4 && this.hasInvitationModelCard && !this.isDefaultPdfUrl && !this.selectedPdfFile){
          this.triggerError();
          this.errorMessage = "Veuillez sélectionner votre modèle PDF.";
          this.currentStep.update(step => step);
          return;
      }
      if (!this.isStepValid(this.currentStep(), form)) {
        //console.log("Form: ", form.controls);
        this.markStepFieldsAsTouched(form);
        return;
      }
      this.currentStep.set(step);
    }
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
    }
  }

  onSubmit() {
    if (this.selectedPdfFile) {
      const formData = new FormData();
      // 'pdfFile' est la clé que le backend utilisera pour récupérer le fichier
      formData.append('file', this.selectedPdfFile, this.selectedPdfFile.name);
      //console.log('pdfModelUrl :', this.pdfModelUrl);

      const eventDatas : CreateEventRequest = {
        organizerId: this.eventData.organizerId,
        title: this.eventData.title,
        description: this.invitationData.mainMessage,
        eventDate: this.eventData.date+' '+ this.eventData.time+':00',
        banquetTime: this.eventData.banquetTime,
        religiousLocation: this.eventData.religiousLocation,
        religiousTime: this.eventData.religiousTime,
        eventCivilLocation: this.eventData.civilLocation,
        eventLocation: this.eventData.location,
        type: this.eventData.type,
        budget: this.eventData.budget,
        eventNameConcerned1: this.eventData.eventNameConcerned1,
        eventNameConcerned2: this.eventData.eventNameConcerned2,
        maxGuests: this.eventData.totalGuests,
        hasPlusOne: this.eventData.allowPlusOne,
        footRestriction: this.eventData.allowDietaryRestrictions || false,
        showWeddingReligiousLocation: this.eventData.showWeddingReligiousLocation,
        status: this.eventData.status,
      }
      const eventInvitationNote = {
        eventId: this.eventData.id,
        invTitle: null,
        mainMessage: null,
        eventTheme: null,
        priorityColors: null,
        qrInstructions: null,
        dressCodeMessage: null,
        thanksMessage1: null,
        sousMainMessage: null,
        closingMessage: null,
        titleColor: null,
        topBandColor: null,
        bottomBandColor: null,
        textColor: null,
        pdfUrl: this.invitationData.pdfUrl,
        logoUrl: null,
        heartIconUrl: null,
        hasInvitationModelCard: this.invitationData.hasInvitationModelCard,
      }

      formData.append('eventDatas', JSON.stringify(eventDatas));
      formData.append('eventInvitationNote', JSON.stringify(eventInvitationNote));
      // //console.log('PDF Firebase URL :', formData.get('pdfFile'));
      // //console.log('eventDatas :', formData.get('eventDatas'));
      // //console.log('eventInvitationNote :', formData.get('eventInvitationNote'));
      this.isLoading = true;
      this.eventService.updateEventWihtFile(Number(this.eventData.id), formData).subscribe(
        (response) => {
          //console.log("Response :: ", response)
          this.isLoading = false;
          this.triggerBAction();
          this.loadEventInvitationNote();
          this.back();
        },
        (error) => {
          this.isLoading = false;
          console.error('❌ Erreur de creation :', error);
          console.log("Message :: ", error.error.message);
          this.errorMessage = error.message || 'Erreur de connexion';
        }
      );
    }else{
      // //console.log('Event Time:', this.eventData.date+' '+ this.eventData.time+':00');
      const eventDatas : CreateEventRequest = {
          organizerId: this.eventData.organizerId,
          title: this.eventData.title,
          description: this.invitationData.mainMessage,
          eventDate: this.eventData.date+' '+ this.eventData.time+':00',
          banquetTime: this.eventData.banquetTime,
          religiousLocation: this.eventData.religiousLocation,
          religiousTime: this.eventData.religiousTime,
          eventCivilLocation: this.eventData.civilLocation,
          eventLocation: this.eventData.location,
          type: this.eventData.type,
          budget: this.eventData.budget,
          eventNameConcerned1: this.eventData.eventNameConcerned1,
          eventNameConcerned2: this.eventData.eventNameConcerned2,
          maxGuests: this.eventData.totalGuests,
          hasPlusOne: this.eventData.allowPlusOne,
          footRestriction: this.eventData.allowDietaryRestrictions || false,
          showWeddingReligiousLocation: this.eventData.showWeddingReligiousLocation,
          status: this.eventData.status,
      }

      const eventInvitationNote = {
        eventId: this.eventData.id,
        invTitle: this.invitationData.title,
        mainMessage: this.invitationData.mainMessage,
        mainMessagePart1: this.invitationData.mainMessagePart1,
        mainMessagePart2: this.invitationData.mainMessagePart2,
        eventTheme: this.invitationData.eventTheme,
        priorityColors: this.invitationData.priorityColors,
        qrInstructions: this.invitationData.qrInstructions,
        dressCodeMessage: this.invitationData.dressCodeMessage,
        thanksMessage1: this.invitationData.thanksMessage1,
        sousMainMessage: this.invitationData.sousMainMessage,
        closingMessage: this.invitationData.closingMessage,
        titleColor: this.invitationData.titleColor,
        topBandColor: this.invitationData.topBandColor,
        bottomBandColor: this.invitationData.bottomBandColor,
        textColor: this.invitationData.textColor,
        pdfUrl: this.invitationData.pdfUrl,
        logoUrl: this.invitationData.logoUrl,
        heartIconUrl: this.invitationData.heartIconUrl,
        hasInvitationModelCard: this.invitationData.hasInvitationModelCard,
      }

      const data = {
        eventDatas: eventDatas,
        eventInvitationNote: eventInvitationNote
      }
      console.log(',[] Event updated:', data);
      this.isLoading = true;
      this.eventService.updateEvent(Number(this.eventData.id), data).subscribe(
        (response) => {
          console.log("[]Response :: ", response);
          this.isLoading = false;
          this.triggerBAction();
          this.loadEventInvitationNote();
          this.back();
        },
        (error) => {
          this.isLoading = false;
          this.showErrorModal = true;
          console.error('❌ Erreur de creation :', error.error.message);
          this.errorMessage = error.error.message || 'Erreur de connexion';
        }
      );
    }
  }

  onFileSelected(event: any) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    const file: File = input.files[0];

    if (file.type === 'application/pdf') {
      this.selectedPdfFile = file;

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.pdfModelUrl = e.target?.result as string;
        this.newFile = true;
        this.invitationData.hasInvitationModelCard = true;
        this.hasInvitationModelCard = true;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert('Veuillez sélectionner un fichier PDF valide.');
    }
  }

  toggleReligiousCeremony() {
    // //console.log("[Avant] this.eventData.showWeddingReligiousLocation: ", this.eventData.showWeddingReligiousLocation);
    if (!this.showWeddingReligiousLocation) {
      this.eventData.religiousLocation = '';
      this.eventData.religiousTime = '';
    }
  }
  toggleInvitationModelCard(){
    //console.log("[toggleInvitationModelCard] hasInvitationModelCard: ", this.invitationData.hasInvitationModelCard);
  }
  get currentPdfUrl(): string {
    return this.pdfModelUrl ?? this.invitationData.pdfUrl ?? this.defaultPdfUrl;
  }

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  onEventTypeChange(eventType: string): void {
    this.selectedEventType = eventType;

    const template = this.invitationTemplates[eventType] ?? {};
    const editorialFields = [
      'title', 'mainMessage', 'mainMessagePart1', 'mainMessagePart2', 'eventTheme',
      'sousMainMessage', 'closingMessage', 'qrInstructions', 'dressCodeMessage', 'thanksMessage1'
    ];
    editorialFields.forEach(field => {
      const val = (template as any)[field];
      if (val !== undefined) (this.invitationData as any)[field] = val;
    });

    this.showWeddingCivilLocation = eventType === 'wedding';
  }

  /** Centralise la condition type === 'other' */
  get isOtherEvent(): boolean {
    return this.eventData.type === 'other';
  }

  get currentProgram() {
    this.current_program = this.programTemplates[this.eventData.type] || [];
    return this.programTemplates[this.eventData.type] || [];
  }

  getInvitationValue(field: keyof InvitationData): any {
    console.log("this.invitationData[field] :", this.invitationData[field])
    return this.invitationData[field];
  }

  getEventTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      wedding: 'Mariage',
      engagement: 'Fiançailles',
      anniversary: 'Anniversaire de Mariage',
      birthday: 'Anniversaire',
      other: 'Événement professionnel',
    };
    return types[type] || 'Non spécifié';
  }

  getStatusLabel(status: string): string {
    const statuses: { [key: string]: string } = {
      planned: 'Prévu',
      active: 'Actif',
      completed: 'Terminé',
      cancelled: 'Annulé',
    };
    return statuses[status] || status;
  }

  getChanges(): Array<{ field: string; newValue: string }> {
    const changes: Array<{ field: string; newValue: string }> = [];

    if (this.eventData.title !== this.originalEventData.title) {
      changes.push({ field: 'Titre', newValue: this.eventData.title });
    }
    if (this.eventData.date !== this.originalEventData.date) {
      changes.push({ field: 'Date', newValue: this.formatDate(this.eventData.date) });
    }
    if (this.eventData.time !== this.originalEventData.time) {
      changes.push({ field: 'Heure', newValue: this.eventData.time });
    }
    if (this.eventData.location !== this.originalEventData.location) {
      changes.push({ field: 'Lieu', newValue: this.eventData.location });
    }
    if (this.eventData.totalGuests !== this.originalEventData.totalGuests) {
      changes.push({ field: 'Nombre d\'invités', newValue: String(this.eventData.totalGuests) });
    }
    if (this.eventData.type !== this.originalEventData.type) {
      changes.push({ field: 'Type', newValue: `${this.eventData.type}` });
    }
    if (this.eventData.status !== this.originalEventData.status) {
      changes.push({ field: 'Statut', newValue: this.getStatusLabel(this.eventData.status) });
    }

    return changes;
  }

  openDeleteModal(modalAction?: string) {
    this.modalAction = modalAction;

    if(modalAction=='delete'){
      this.warningMessage = "Êtes-vous sûr de vouloir supprimer cet événement ?";
      this.showDeleteModal = true;
    }
  }

  deleteEvent() {
    this.isLoading = false;
    this.eventService.deleteEvent(Number(this.eventId)).subscribe(
        (response) => {
            //console.log("[deleteEvent] response :: ", response);
            this.isLoading = false;
            this.triggerBAction();
            this.router.navigate(['/evenements']);
        },
        (error) => {
            this.isLoading = false;
            if (error.status === 409) {
            // afficher le message venant du backend
            //console.log("error.error.error :: ", error.error.error);
            this.triggerError();
            this.errorMessage = error.error.error;
            console.warn(this.errorMessage);
            } else {
            this.errorMessage = "Une erreur est survenue.";
            }
        }
    );
  }

  confirmDelete() {
    this.deleteEvent()
    this.closeModal();
  }

  closeModal() {
    this.showDeleteModal = false;
  }

  // Logique error-modal
  triggerError() {
    this.showErrorModal = true;
  }

  closeErrorModal() {
    this.showErrorModal = false;
  }

  triggerBAction() {
    // //console.log("AddEventComponent → Je demande à DashboardCmp d’exécuter une action !");
    this.communicationService.triggerSenderAction('refresh');
  }

  removePdfModel() {
    this.pdfModelUrl = null;
    this.selectedPdfFile = null;
    this.newFile = false;
    this.invitationData.hasInvitationModelCard = false;
    this.hasInvitationModelCard = false;
  }

  resetForm() {
    // this.syncEventToInvitation();
    this.invitationData.mainMessage = "C'est avec un immense bonheur que nous vous invitons à célébrer notre union. Votre présence à nos côtés rendra cette journée inoubliable.";
    this.invitationData.eventTheme = 'CHIC ET GLAMOUR';
    this.invitationData.priorityColors = 'Bleu, Blanc, Rouge, Noir';
    this.invitationData.titleColor = '#b58b63';
    this.invitationData.topBandColor = '#0055A4';
    this.invitationData.bottomBandColor = '#EF4135';
  }

  back() {
    window.history.back();
  }
}

