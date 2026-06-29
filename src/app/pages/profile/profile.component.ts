import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ConfirmDeleteModalComponent } from "../../components/confirm-delete-modal/confirm-delete-modal";
import { CommunicationService } from '../../services/share.service';
import { Location } from '@angular/common';

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  notificationMode: 'whatsapp' | 'email';
  avatar?: string;
  bio?: string;
  createdAt: string;
}

interface CountryDialCode {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  attendanceNotifications: boolean;
  thankNotifications: boolean;
  eventReminders: boolean;
  marketingEmails: boolean;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showPhone: boolean;
  allowMessages: boolean;
  allowEventInvites: boolean;
}

interface PasswordData {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDeleteModalComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  activeTab = 'personal';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  loading = false;
  showDeleteModal = false;
  warningMessage: string = "";
  modalAction: string | undefined;
  originalUserProfile!: UserProfile;
  userId!: number;

  notificationMeans = {
    whatsapp: true,
    email: false
  };
  notificationMode: 'whatsapp' | 'email' = 'whatsapp';
  phoneLocalNumber = '';
  selectedCountryCode = 'CM';
  countryDialCodes: CountryDialCode[] = [
    { name: 'Cameroun', code: 'CM', dialCode: '+237', flag: '🇨🇲' },
    { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
    { name: 'Belgique', code: 'BE', dialCode: '+32', flag: '🇧🇪' },
    { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
    { name: 'Etats-Unis', code: 'US', dialCode: '+1', flag: '🇺🇸' },
    { name: 'Suisse', code: 'CH', dialCode: '+41', flag: '🇨🇭' },
    { name: 'Bresil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
    { name: 'Maurice', code: 'MU', dialCode: '+230', flag: '🇲🇺' },
    { name: 'Tchad', code: 'TD', dialCode: '+235', flag: '🇹🇩' },
    { name: 'Royaume-Uni', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
    { name: 'Allemagne', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
    { name: 'Espagne', code: 'ES', dialCode: '+34', flag: '🇪🇸' },
    { name: 'Italie', code: 'IT', dialCode: '+39', flag: '🇮🇹' },
    { name: 'Maroc', code: 'MA', dialCode: '+212', flag: '🇲🇦' },
    { name: 'Algerie', code: 'DZ', dialCode: '+213', flag: '🇩🇿' },
    { name: 'Tunisie', code: 'TN', dialCode: '+216', flag: '🇹🇳' },
    { name: 'Senegal', code: 'SN', dialCode: '+221', flag: '🇸🇳' },
    { name: "Cote d'Ivoire", code: 'CI', dialCode: '+225', flag: '🇨🇮' },
    { name: 'Mali', code: 'ML', dialCode: '+223', flag: '🇲🇱' },
    { name: 'Burkina Faso', code: 'BF', dialCode: '+226', flag: '🇧🇫' },
    { name: 'Benin', code: 'BJ', dialCode: '+229', flag: '🇧🇯' },
    { name: 'Togo', code: 'TG', dialCode: '+228', flag: '🇹🇬' },
    { name: 'Gabon', code: 'GA', dialCode: '+241', flag: '🇬🇦' },
    { name: 'Congo', code: 'CG', dialCode: '+242', flag: '🇨🇬' },
    { name: 'RDC', code: 'CD', dialCode: '+243', flag: '🇨🇩' },
    { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬' },
    { name: 'Ghana', code: 'GH', dialCode: '+233', flag: '🇬🇭' },
    { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪' },
    { name: 'Afrique du Sud', code: 'ZA', dialCode: '+27', flag: '🇿🇦' }
  ];

  passwordData: PasswordData  = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  tabs = [
    { id: 'personal', label: 'Informations', icon: '👤' },
    { id: 'security', label: 'Sécurité', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    // { id: 'privacy', label: 'Confidentialité', icon: '🔐' },
    { id: 'account', label: 'Compte', icon: '⚙️' },
  ];

  userProfile: UserProfile = {
    id: 'user_123456',
    fullName: 'William Ndongmo',
    email: 'williamndongmo899@gmail.com',
    phone: '+237 655002318',
    notificationMode: 'email',
    avatar: 'https://via.placeholder.com/120',
    bio: 'Passionné par l\'organisation d\'événements',
    createdAt: '2023-01-15',
  };

  notificationPrefs: NotificationPreferences = {
    emailNotifications: true,
    attendanceNotifications: false,
    thankNotifications: true,
    eventReminders: true,
    marketingEmails: false,
  };

  privacySettings: PrivacySettings = {
    profileVisibility: 'public',
    showEmail: true,
    showPhone: false,
    allowMessages: true,
    allowEventInvites: true,
  };

  constructor(
    private router: Router,
    private location: Location,
    private authService: AuthService,
    private communicationService: CommunicationService
  ) {}

  ngOnInit() {
    this.getUserProfile();
    this.triggerBAction();
  }

  getUserProfile() {
    this.authService.getMe().subscribe(
      (response) => {
        this.userId = response.id;
        this.userProfile = {
          id: 'user_'+response.id,
          fullName: response.name,
          email: response.email,
          phone: response.phone,
          notificationMode: response.notification_mode || 'email',
          avatar: response.avatar_url,
          bio: response.bio || 'Passionné par l\'organisation d\'événements',
          createdAt: response.created_at,
        };
        this.notificationPrefs = {
          emailNotifications: response.email_notifications,
          attendanceNotifications: response.attendance_notifications,
          thankNotifications: response.thank_notifications,
          eventReminders: response.event_reminders,
          marketingEmails: response.marketing_emails,
        };
        this.originalUserProfile = { ...this.userProfile };
        this.notificationMeans.whatsapp = this.userProfile.notificationMode === 'whatsapp';
        this.notificationMeans.email = this.userProfile.notificationMode !== 'whatsapp';
        this.notificationMode = this.userProfile.notificationMode;
        this.setPhoneInputFromProfile(this.userProfile.phone);
        // FIX: propager le profil mis à jour dans currentUser$ (header, etc.)
        this.authService.updateCurrentUser({
          id: response.id,
          email: response.email,
          name: response.name,
          role: response.role
        });
      },
      (error) => {
        console.error('❌ Erreur de creation :', error.message.split(':')[4]);
        console.log("Message :: ", error.message);
        this.errorMessage = error.message || 'Erreur de connexion';
      }
    );
  }

  saveProfile() {
    const userId = parseInt(this.userProfile.id.replace('user_', ''), 10);
    this.userProfile.phone = this.buildInternationalPhoneNumber();
    const data = {
      name: this.userProfile.fullName,
      email: this.userProfile.email,
      phone: this.userProfile.phone,
      notificationMode: this.userProfile.notificationMode,
      bio: this.userProfile.bio,
      email_notifications: this.notificationPrefs.emailNotifications,
      attendance_notifications: this.notificationPrefs.attendanceNotifications,
      thank_notifications: this.notificationPrefs.thankNotifications,
      event_reminders: this.notificationPrefs.eventReminders,
      marketing_emails: this.notificationPrefs.marketingEmails,
    };
    console.log("data.email: ", data.email);
 
    if(data.notificationMode == 'whatsapp' && !data.phone){
      this.errorMessage = "Le champ whatsapp est obligatoire";
      return;
    }

    const bool = data.notificationMode !== 'whatsapp' || this.validatePhoneNumber(data.phone);
    if(!bool) {
      this.errorMessage = 'Le numéro doit contenir l’indicatif du pays (ex: +237655002318).'
      return;
    }

    this.loading = true;
    this.authService.updateProfile(userId, data).subscribe(
      (response) => {
        this.loading = false;
        this.errorMessage = '';
        // FIX: mettre a jour currentUser$ pour que le header reflète
        // immédiatement le nouveau nom/email sans rechargement
        this.authService.clearCache();
        this.getUserProfile();
      },
      (error) => {
        this.loading = false;
        console.error('❌ Erreur de creation :', error.error.error);
        console.log("Message :: ", error.error);
        this.errorMessage = error.error.error || 'Erreur de connexion';
      }
    );
  }

  toggleNotificationMode(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    this.userProfile.notificationMode = checked
      ? 'whatsapp'
      : 'email';
    this.notificationMeans.whatsapp = checked;
    this.notificationMeans.email = !checked;
    this.notificationMode = this.userProfile.notificationMode;
    console.log('Notification mode updated:', this.userProfile.notificationMode);
  }

  validatePhoneNumber(phone: string | undefined): boolean {
    return !!phone?.trim() && /^\+\d{1,4}\d{6,15}$/.test(phone.trim());
  }

  // Reset formulaire
  resetForm(form: NgForm) {
    console.log('Reset form called');

    // restaurer les valeurs initiales
    this.userProfile = { ...this.originalUserProfile };
    this.notificationMeans.whatsapp = this.userProfile.notificationMode === 'whatsapp';
    this.notificationMeans.email = this.userProfile.notificationMode !== 'whatsapp';
    this.notificationMode = this.userProfile.notificationMode;
    this.setPhoneInputFromProfile(this.userProfile.phone);

    form.resetForm({
      ...this.userProfile,
      countryDialCode: this.selectedCountryCode,
      phone: this.phoneLocalNumber
    });
  }

  onCountryDialCodeChange() {
    this.userProfile.phone = this.buildInternationalPhoneNumber();
  }

  onPhoneLocalNumberChange(value: string) {
    this.phoneLocalNumber = value;
    this.userProfile.phone = this.buildInternationalPhoneNumber();
  }

  buildInternationalPhoneNumber(): string {
    const phoneValue = this.phoneLocalNumber.trim();

    if (!phoneValue) {
      return '';
    }

    const sanitizedPhone = phoneValue.replace(/[^\d+]/g, '');

    if (sanitizedPhone.startsWith('+')) {
      return `+${sanitizedPhone.slice(1).replace(/\D/g, '')}`;
    }

    const nationalNumber = sanitizedPhone.replace(/\D/g, '').replace(/^0+/, '');
    return nationalNumber ? `${this.getSelectedCountryDialCode()}${nationalNumber}` : '';
  }

  private getSelectedCountryDialCode(): string {
    return this.countryDialCodes.find(country => country.code === this.selectedCountryCode)?.dialCode || '+237';
  }

  private setPhoneInputFromProfile(phone?: string) {
    const normalizedPhone = phone?.replace(/[^\d+]/g, '') || '';

    if (!normalizedPhone) {
      this.phoneLocalNumber = '';
      this.selectedCountryCode = 'CM';
      return;
    }

    const matchingCountry = [...this.countryDialCodes]
      .sort((a, b) => b.dialCode.length - a.dialCode.length)
      .find(country => normalizedPhone.startsWith(country.dialCode));

    if (matchingCountry) {
      this.selectedCountryCode = matchingCountry.code;
      this.phoneLocalNumber = normalizedPhone.slice(matchingCountry.dialCode.length);
      this.userProfile.phone = this.buildInternationalPhoneNumber();
      return;
    }

    this.phoneLocalNumber = normalizedPhone;
    this.userProfile.phone = this.buildInternationalPhoneNumber();
  }

  changePassword(form: NgForm): void {
    console.log('Changement de mot de passe initié');

    this.errorMessage = '';

    if (!this.passwordData.currentPassword ||
        !this.passwordData.newPassword ||
        !this.passwordData.confirmPassword) {
        this.errorMessage = 'Tous les champs sont obligatoires.';
        this.successMessage = '';
        return;
    }

    if (this.passwordData.newPassword.length < 8) {
        this.errorMessage = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
        return;
    }

    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
        this.errorMessage = 'Les mots de passe ne correspondent pas.';
        return;
    }

    this.loading = true;
    const data = {
      currentPassword: this.passwordData.currentPassword,
      newPassword: this.passwordData.newPassword,
    };
    console.log('Données envoyées:', data);

    this.authService.updatePassword(this.userId, data).subscribe(
      (response) => {
        console.log("[saveProfile] Response :: ", response);
        this.loading = false;
        this.successMessage = response.message || 'Mot de passe modifié avec succès.';
        this.errorMessage = '';
        form.resetForm();

        this.passwordData = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        };
      },
      (error) => {
        this.loading = false;
        this.successMessage = '';
        console.error('❌ Erreur de creation :', error);
        console.log("Message :: ", error.error.error);
        this.errorMessage = error.error.error || 'Erreur de connexion';
      }
    );
  }

  goToResetPage() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/forgot-password']);
  }

  openDeleteModal(modalAction?: string) {
    this.modalAction = modalAction;
    if(modalAction=='delete'){
      this.warningMessage = "Êtes-vous sûr de vouloir supprimer votre compte ?";
      this.showDeleteModal = true;
    }
  }

  deleteAccount(){
    this.loading = true;
    this.authService.deleteAccount(this.userId).subscribe(
      (response) => {
        console.log("[saveProfile] Response :: ", response);
        this.loading = false;
        this.authService.logout();
      },
      (error) => {
        this.loading = false;
        this.successMessage = '';
        console.error('❌ Erreur de creation :', error);
        console.log("Message :: ", error.error.error);
        this.errorMessage = error.error.error || 'Erreur de connexion';
      }
    );
  }

  confirmDelete() {
    if(this.modalAction=='delete'){
      this.deleteAccount();
    }
    this.closeModal();
  }

  closeModal() {
    this.showDeleteModal = false;
  }

  goBack() {
    this.location.back();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  triggerBAction() {
    this.communicationService.triggerSenderAction('hide-scanner');
  }
}
