import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { CreateEventRequest, EventService } from '../../services/event.service';
import { SpinnerComponent } from "../../components/spinner/spinner";
import { CommunicationService } from '../../services/share.service';
import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ErrorModalComponent } from "../../components/error-modal/error-modal";
import { animate, style, transition, trigger } from '@angular/animations';
import { PRICE_PER_GUEST } from '../pricing/pricing.component';

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
  hasInvitationModelCard: boolean;
  banquetTime: string;

  // Personnes concernées
  nameConcerned1: string;
  nameConcerned2: string;

  // Contenu personnalisé
  title: string;
  mainMessage: string;
  // Pour le type 'other' : le mainMessage est scindé en deux parties
  // pour insérer le titre de l'événement entre elles
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

  // Logo et images
  logoUrl?: string;
  heartIconUrl?: string;
}

@Pipe({ name: 'safe', standalone: true })
export class SafePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(url: any) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
@Component({
  selector: 'app-add-event',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink,
            SpinnerComponent, SafePipe, ErrorModalComponent],
  templateUrl: './add-event.component.html',
  styleUrls: ['./add-event.component.scss'],
  animations: [
      trigger('slideDown', [
        transition(':enter', [
          style({ height: 0, opacity: 0, transform: 'translateY(-10px)' }),
          animate(
            '300ms ease-out',
            style({ height: '*', opacity: 1, transform: 'translateY(0)' })
          )
        ]),
        transition(':leave', [
          animate(
            '200ms ease-in',
            style({ height: 0, opacity: 0, transform: 'translateY(-10px)' })
          )
        ])
      ])
    ]
})
export class AddEventComponent implements OnInit{
  currentStep = signal(1);
  showAddGuestModal = signal(false);
  errorMessage : string ='';
  isLoading = false;
  showWeddingNames = false;
  showEngagementNames = false;
  showAnniversaryNames = false;
  showBirthdayNames = false;
  showAnother = false;
  showErrorModal = false;
  isDefaultPdfUrl = false;
  showWeddingCivilLocation = true;
  showWeddingReligiousLocation = false;
  hasInvitationModelCard = false;
  selectedPdfFile: File | null = null; // Pour stocker le fichier réel
  pdfModelUrl: string | null = null;   // Pour l'aperçu (base64)
  newFile = false;
  defaultPdfUrl = 'pdfs/default_invitation_card.pdf';
  calculatedAmount = 0;
  PRICE_PER_GUEST = PRICE_PER_GUEST;

  eventData = {
    title: '',
    date: '',
    time: '',
    banquetTime: '',
    civilLocation: '',
    location: '',
    religiousLocation: '',
    religiousTime: '',
    description: '',
    totalGuests: 0,
    budget: 0,
    type: '',
    eventNameConcerned1: '',
    eventNameConcerned2: '',
    allowDietaryRestrictions: true,
    showWeddingReligiousLocation: false,
    hasInvitationModelCard : false,
    allowPlusOne: true,
  };

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

  organizerId: number | undefined;
  currentUser: User | null = null;

  constructor(
    private router: Router,
    private eventService: EventService,
    private authService: AuthService,
    private communicationService: CommunicationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.organizerId = user?.id;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onQuotaChange() {
    this.calculatedAmount = (this.eventData.totalGuests || 0) * this.PRICE_PER_GUEST;
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
        this.hasInvitationModelCard && !this.isDefaultPdfUrl &&
        !this.selectedPdfFile){
          this.triggerError();
          this.errorMessage = "Veuillez sélectionner votre modèle PDF.";
          this.currentStep.update(step => step);
          return;
      }
      if (!this.isStepValid(this.currentStep(), form)) {
        this.markStepFieldsAsTouched(form);
        console.log("---Blocage---");
        return;
      }
      this.currentStep.update(step => step + 1);
      this.syncEventToInvitation();
    }
  }

  changeStep(form: NgForm, step: number) {
    if (step < 5) {
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
        this.markStepFieldsAsTouched(form);
        return;
      }
      this.currentStep.set(step);
      this.syncEventToInvitation();
    }
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
      this.syncEventToInvitation();
    }
  }

  private syncEventToInvitation() {
    this.invitationData.eventName = this.eventData.title;
    this.invitationData.eventDate = this.eventData.date;
    this.invitationData.eventTime = this.eventData.time;
    this.invitationData.eventLocation = this.eventData.location;
    this.invitationData.eventCivilLocation = this.eventData.civilLocation;
    this.invitationData.banquetTime = this.eventData.banquetTime;
    this.invitationData.religiousLocation = this.eventData.religiousLocation;
    this.invitationData.religiousTime = this.eventData.religiousTime;
    this.invitationData.showReligiousCeremony = this.eventData.showWeddingReligiousLocation;
    this.invitationData.nameConcerned1 = this.eventData.eventNameConcerned1;
    this.invitationData.nameConcerned2 = this.eventData.eventNameConcerned2;
  }

  onSubmit() {
    const datas = [];
    if (this.selectedPdfFile) {
      const formData = new FormData();
      // 'pdfFile' est la clé que le backend utilisera pour récupérer le fichier
      formData.append('file', this.selectedPdfFile, this.selectedPdfFile.name);

      const eventDatas : CreateEventRequest = {
        organizerId: this.organizerId,
        title: this.eventData.title,
        description: this.invitationData.mainMessage,
        eventDate: this.eventData.date+' '+'10:00:00',
        banquetTime: this.eventData.banquetTime,
        religiousLocation: this.eventData.religiousLocation,
        religiousTime: this.eventData.religiousTime,
        eventCivilLocation: this.eventData.civilLocation,
        eventLocation: this.eventData.location,
        maxGuests: this.eventData.totalGuests,
        hasPlusOne: this.eventData.allowPlusOne,
        budget: this.eventData.budget,
        type: this.eventData.type,
        eventNameConcerned1: this.eventData.eventNameConcerned1 || '',
        eventNameConcerned2: this.eventData.eventNameConcerned2 || '',
        footRestriction: this.eventData.allowDietaryRestrictions,
        showWeddingReligiousLocation: this.eventData.showWeddingReligiousLocation,
        status: 'active'
      }
      const eventInvitationNote = {
        hasInvitationModelCard: this.eventData.hasInvitationModelCard,
      }
      datas.push(eventDatas);
      //console.log("datas: ", datas);
      formData.append('eventDatas', JSON.stringify(datas));
      formData.append('eventInvitationNote', JSON.stringify(eventInvitationNote));
      this.isLoading = true;
      this.eventService.createEventWihtFile(formData).subscribe(
        (response) => {
          ////console.log("Response :: ", response)
          this.isLoading = false;
          this.triggerBAction();
          this.router.navigate(['/evenements']);
        },
        (error) => {
          this.isLoading = false;
          console.error('❌ Erreur de creation :', error);
          this.errorMessage = error.message || 'Erreur de connexion';
        }
      );
    }else{
      const eventDatas : CreateEventRequest = {
        organizerId: this.organizerId,
        title: this.eventData.title,
        description: this.invitationData.mainMessage,
        eventDate: this.eventData.date+' '+ this.eventData.time+':00',
        banquetTime: this.eventData.banquetTime,
        religiousLocation: this.eventData.religiousLocation,
        religiousTime: this.eventData.religiousTime,
        eventCivilLocation: this.eventData.civilLocation,
        eventLocation: this.eventData.location,
        maxGuests: this.eventData.totalGuests,
        hasPlusOne: this.eventData.allowPlusOne,
        budget: this.eventData.budget,
        type: this.eventData.type,
        eventNameConcerned1: this.eventData.eventNameConcerned1 || '',
        eventNameConcerned2: this.eventData.eventNameConcerned2 || '',
        footRestriction: this.eventData.allowDietaryRestrictions,
        showWeddingReligiousLocation: this.eventData.showWeddingReligiousLocation,
        status: 'active'
      }

      const eventInvitationNote = {
        invTitle: this.invitationData.title,
        mainMessage: this.invitationData.mainMessage,
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
        logoUrl: this.invitationData.logoUrl,
        hasInvitationModelCard: this.eventData.hasInvitationModelCard,
        heartIconUrl: this.invitationData.heartIconUrl,
      }

      datas.push(eventDatas);
      const data = {
        eventDatas: datas,
        eventInvitationNote: eventInvitationNote
      }

      //console.log('Event created:', data);
      this.isLoading = true;
      this.eventService.createEvent(data).subscribe(
        (response) => {
          //console.log("Response :: ", response)
          this.isLoading = false;
          this.triggerBAction();
          this.router.navigate(['/evenements']);//dashboard
        },
        (error) => {
          this.isLoading = false;
          console.error('❌ Erreur de creation :', error.error.error);
          //console.log("Message :: ", error.message);
          if (error.error.error === "PAYMENT_REQUIRED") {
            // Afficher l'alerte
            this.showAddGuestModal.set(false);
            return;
          }
          this.errorMessage = error.message || 'Erreur de connexion';
        }
      );
    }
  }

  toggleReligiousCeremony() {
    this.eventData.showWeddingReligiousLocation = this.showWeddingReligiousLocation;
    if (!this.showWeddingReligiousLocation) {
      this.eventData.religiousLocation = '';
      this.eventData.religiousTime = '';
    }
  }
  toggleInvitationModelCard(){
    this.eventData.hasInvitationModelCard = this.hasInvitationModelCard;
    //console.log("this.hasInvitationModelCard: ", this.hasInvitationModelCard)
  }
  get currentPdfUrl(): string {
    return this.pdfModelUrl ?? this.defaultPdfUrl;
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

    // Applique le template du nouveau type en préservant les champs
    // liés à l'événement (dates, lieux) déjà renseignés par l'utilisateur.
    this.applyTemplate(eventType);

    this.showWeddingCivilLocation = eventType === 'wedding';
  }

  /**
   * Applique le template d'invitation correspondant au type donné.
   * Stratégie : on ne remplace que les champs éditoriaux (textes, thème, couleurs)
   * et on conserve les données événementielles (dates, lieux, noms) déjà saisies.
   * Ainsi un changement de type après saisie partielle ne perd aucune donnée.
   */
  private applyTemplate(eventType: string): void {
    const template = this.invitationTemplates[eventType] ?? {};

    // Champs éditoriaux à réinitialiser avec le nouveau template
    const editorialFields: (keyof InvitationData)[] = [
      'title', 'mainMessage', 'mainMessagePart1', 'mainMessagePart2', 'eventTheme', 'sousMainMessage',
      'closingMessage', 'qrInstructions', 'dressCodeMessage', 'thanksMessage1'
    ];

    editorialFields.forEach(field => {
      const tplValue = (template as any)[field];
      if (tplValue !== undefined) {
        (this.invitationData as any)[field] = tplValue;
      }
    });

    // Les couleurs et assets de base sont réappliqués depuis baseInvitationData
    // seulement si l'utilisateur n'a pas encore modifié ces valeurs
    const colorFields: (keyof InvitationData)[] = [
      'titleColor', 'topBandColor', 'bottomBandColor', 'textColor', 'logoUrl', 'heartIconUrl'
    ];
    colorFields.forEach(field => {
      const baseValue = (this.baseInvitationData as any)[field];
      if (baseValue !== undefined && !(this.invitationData as any)[field]) {
        (this.invitationData as any)[field] = baseValue;
      }
    });
  }

  /** Centralise la condition type === 'other' pour éviter les *ngIf répétitifs */
  get isOtherEvent(): boolean {
    return this.eventData.type === 'other';
  }

  get currentProgram() {
    this.current_program = this.programTemplates[this.eventData.type] || [];
    return this.programTemplates[this.eventData.type] || [];
  }

  getInvitationValue(field: keyof InvitationData): any {
    return this.invitationData[field];
  }

  getEventTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      wedding: 'Mariage',
      engagement: 'Fiançailles',
      anniversary: 'Anniversaire de Mariage',
      birthday: 'Anniversaire',
      other: 'Autre',
    };
    return types[type] || 'Non spécifié';
  }

  triggerBAction() {
    this.communicationService.triggerSenderAction('refresh');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    const file: File = input.files[0];

    if (file.type === 'application/pdf') {
      this.selectedPdfFile = file;

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.pdfModelUrl = e.target?.result as string;
        this.hasInvitationModelCard = true;
        this.eventData.hasInvitationModelCard = true;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert('Veuillez sélectionner un fichier PDF valide.');
    }
  }

  removePdfModel() {
    this.pdfModelUrl = null;
    this.selectedPdfFile = null;
    this.hasInvitationModelCard = false;
    this.eventData.hasInvitationModelCard = false;
  }

  /**
   * Réinitialise les champs éditoriaux au template officiel du type actuel.
   * Préserve les données événementielles (dates, lieux, noms).
   */
  resetForm(hasInvitationModelCard: boolean) {
    if (hasInvitationModelCard) this.syncEventToInvitation();
    // Réapplique le template complet du type courant
    const type = this.eventData.type || 'wedding';
    const template = this.invitationTemplates[type] ?? {};
    Object.assign(this.invitationData, this.baseInvitationData, template);
  }

  // Logique error-modal
  triggerError() {
    this.showErrorModal = true;
  }

  closeErrorModal() {
    this.showErrorModal = false;
  }

  onManageClicked(): void {
    //console.log('Redirection vers la gestion des invités');
  }
}

