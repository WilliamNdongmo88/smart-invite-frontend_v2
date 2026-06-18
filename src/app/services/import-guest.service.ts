import { Injectable } from '@angular/core';

export interface ImportedGuest {
    eventId?: number;
    nom: string;
    email: string;
    phone?: string;
    rsvpStatus?: string;
    plusOne?: boolean;
    notificationMode?: 'whatsapp' | 'email';
}

@Injectable({
  providedIn: 'root',
})
export class ImportGuestService {

  parseCSV(content: string): ImportedGuest[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const guests: ImportedGuest[] = [];
    const headers = this.parseCSVLine(lines[0]);
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      //console.log("### values::", values);
      const guest = this.mapRowToGuest(headers, values);
      console.log("[#1#] guest::", guest);
      if (guest && guest.nom && (guest.email || guest.phone)) {
        guests.push(guest);
      }
    }
    console.log("[#2#] guests::", guests)
    return guests;
  }

  async parseExcel(file: File): Promise<ImportedGuest[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e: any) => {
        try {
          if (typeof (window as any).XLSX !== 'undefined') {
            const XLSX = (window as any).XLSX;
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            const guests = jsonData.map((row: any) =>
              this.mapExcelRowToGuest(row)
            ).filter((guest: ImportedGuest | null) => guest !== null) as ImportedGuest[];

            resolve(guests);
          } else {
            const text = new TextDecoder().decode(e.target.result);
            resolve(this.parseCSV(text));
          }
        } catch (error) {
          reject(new Error('Erreur lors du parsing du fichier Excel'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private mapRowToGuest(headers: string[], values: string[]): ImportedGuest | null {
    const guest: ImportedGuest = {
      eventId: 0,
      nom: '',
      email: '',
      notificationMode: 'whatsapp'
    };

    const headerMap: { [key: string]: string } = {};
    headers.forEach((header, index) => {
    // console.log("### header.toLowerCase().trim()::", header.toLowerCase().trim());
    // console.log("### values[index]::", values[index]);
    headerMap[header.toLowerCase().trim()] = values[index] || '';
    });
    // console.log("### [headerMap]::", headerMap)
    // Map common header variations
    const nameKeys = ['name', 'nom', 'prenom', 'first name', 'full name'];
    const emailKeys = ['email', 'e-mail', 'mail', 'email address'];
    const phoneKeys = ['phone', 'telephone', 'tel', 'mobile', 'téléphone'];
    const rsvpStatusKeys = ['statusRsvp', 'rsvpStatus', 'rsvp-status', 'Status-RSVP'];
    const plusOneKeys = ['plus one', 'plusone', '+1', 'guest', 'accompagnant'];
    const notificationModeKeys = ['notification mode', 'notificationmode', 'notification-mode', 'notification-mode'];

    // Find and assign values
    for (const key of nameKeys) {
      if (headerMap[key]) {
        guest.nom = headerMap[key];
        break;
      }
    }

    for (const key of emailKeys) {
      if (headerMap[key]) {
        guest.email = headerMap[key];
        break;
      }
    }

    for (const key of phoneKeys) {
      if (headerMap[key]) {
        guest.phone = headerMap[key];
        break;
      }
    }

    for (const key of rsvpStatusKeys) {
      if (headerMap[key]) {
        guest.rsvpStatus = headerMap[key];
        break;
      }
    }

    for (const key of plusOneKeys) {
      if (headerMap[key]) {
        const value = headerMap[key].toLowerCase();
        guest.plusOne = value === 'yes' || value === 'oui' || value === '1' || value === 'true';
        break;
      }
    }

    for (const key of notificationModeKeys) {
      if (headerMap[key]) {
        const value = headerMap[key].toLowerCase();
        guest.notificationMode = value === 'whatsapp' || value === 'email' ? value : 'whatsapp';
        break;
      }
    }

    //console.log("### [guest]::", guest)
    // return guest.name && guest.email ? guest : null;
    return headerMap as any;
  }

  private mapExcelRowToGuest(row: any): ImportedGuest | null {
    const guest: ImportedGuest = {
        eventId: 0,
        nom: '',
        email: ''
    };

    // Try to find name
    const nameKeys = ['Name', 'Nom', 'Prénom', 'First Name', 'Full Name'];
    for (const key of nameKeys) {
      if (row[key]) {
        guest.nom = row[key];
        break;
      }
    }

    // Try to find email
    const emailKeys = ['Email', 'E-mail', 'Mail', 'Email Address'];
    for (const key of emailKeys) {
      if (row[key]) {
        guest.email = row[key];
        break;
      }
    }

    // Try to find phone
    const phoneKeys = ['Phone', 'Telephone', 'Tel', 'Mobile', 'Téléphone'];
    for (const key of phoneKeys) {
      if (row[key]) {
        guest.phone = row[key];
        break;
      }
    }

    // Try to find dietary restrictions
    const rsvpStatusKeys = ['statusRsvp', 'rsvpStatus', 'rsvp-status', 'Status-RSVP'];
    for (const key of rsvpStatusKeys) {
      if (row[key]) {
        guest.rsvpStatus = row[key];
        break;
      }
    }

    // Try to find plus one
    const plusOneKeys = ['Plus One', 'PlusOne', '+1', 'Guest', 'Accompagnant'];
    for (const key of plusOneKeys) {
      if (row[key]) {
        const value = String(row[key]).toLowerCase();
        guest.plusOne = value === 'yes' || value === 'oui' || value === '1' || value === 'true';
        break;
      }
    }

    // Try to find notification mode
    const notificationModeKeys = ['Notification Mode', 'NotificationMode', 'notification-mode', 'Notification-Mode'];
    for (const key of notificationModeKeys) {
      if (row[key]) {
        const value = String(row[key]).toLowerCase();
        guest.notificationMode = value === 'whatsapp' || value === 'email' ? value : 'email';
        break;
      }
    }

    return guest.nom && guest.email && guest.phone ? guest : null;
  }

  validateGuests(guests: ImportedGuest[]): { valid: ImportedGuest[]; errors: string[] } {
    const valid: ImportedGuest[] = [];
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    guests.forEach((guest, index) => {
      const rowNumber = index + 2;
      const hasEmail = guest.email && guest.email.trim() !== '';
      const hasWhatsapp = guest.phone && guest.phone.trim() !== '';

      // Nom obligatoire
      if (!guest.nom || guest.nom.trim() === '') {
        errors.push(`Ligne ${rowNumber}: Le nom est requis`);
        return;
      }

      // Email OU WhatsApp obligatoire
      if (!hasEmail && !hasWhatsapp) {
        errors.push(
          `Ligne ${rowNumber}: L'email ou le numéro WhatsApp est requis`
        );
        return;
      }

      // Validation email seulement s'il existe
      if (hasEmail && !emailRegex.test(guest.email)) {
        errors.push(
          `Ligne ${rowNumber}: L'email "${guest.email}" est invalide`
        );
        return;
      }

      valid.push(guest);
    });

    return { valid, errors };
  }

  generateCSVTemplate(): string {
    return `
      nom,email,phone,rsvpStatus,plusone,notificationMode
      Ndongmo Thierry,fotso-n@gmail.com,+237697432310,pending,1,whatsapp
      Djoumessi Michka,djoumessi-m@gmail.com,+237670113245,pending,1,whatsapp
      Kevin Ngassa,kevin.ngassa@gmail.com,+237675443902,pending,0,email
      Samantha Fotso,samantha.fotso@gmail.com,+237691001234,pending,0,email
      Brenda Noubissi,brenda.noubissi@gmail.com,+237670005678,pending,1,whatsapp
    `;}

  downloadCSVTemplate() {
    const csv = this.generateCSVTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'template-invites.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

