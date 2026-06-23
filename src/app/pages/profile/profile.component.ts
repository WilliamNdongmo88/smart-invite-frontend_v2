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
          notificationMode: response.notification_mode,
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
 
    if(data.notificationMode == 'whatsapp' && data.phone == null){
      this.errorMessage = "Le champ whatsapp est obligatoire";
      return;
    }

    const bool = this.validatePhoneNumber(data.phone);
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

    form.resetForm(this.userProfile);
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
