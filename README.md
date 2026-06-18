# Smart Invite - Wedding Invitation Management Platform

Une application moderne et élégante pour gérer les invitations de mariage, construite avec **Angular 19** et un design sophistiqué inspiré par le thème doré.

## 🎨 Design & Thème

- **Palette de couleurs** : Or doré (#D4AF37), blanc pur, noir élégant
- **Typographie** : Cormorant Garamond (titres), Lato (corps)
- **Style** : Minimaliste, élégant avec transitions fluides
- **Inspiration** : Image de mariage avec boucles dorées et silhouettes élégantes

## 📋 Fonctionnalités

### Pages Principales

1. **Page d'accueil** - Présentation élégante avec :
   - Hero section avec appel à l'action
   - Section de fonctionnalités (6 cartes)
   - Guide "Comment ça marche"
   - Section d'appel à l'action finale
   - Pied de page complet

2. **Tableau de bord** - Gestion des événements :
   - Vue d'ensemble avec statistiques (événements, invités, confirmations)
   - Liste des événements avec détails
   - Taux de réponse en temps réel
   - Actions rapides (inviter, éditer)

3. **Page d'invitation** - Interface de réponse :
   - Affichage élégant de l'invitation
   - Détails de l'événement
   - Boutons de réponse (confirmer/refuser)
   - Champs pour restrictions alimentaires et +1
   - Page de confirmation de réponse

4. **Header/Navigation** - Navigation responsive :
   - Logo personnalisé
   - Menu de navigation
   - Menu mobile adaptatif
   - Liens de connexion

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Installation

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
ng serve

# Accéder à l'application
# http://localhost:4200
```

### Build pour la production

```bash
ng build --configuration production
```

## 📁 Structure du Projet

```
smart-invite-angular/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── header/
│   │   │       └── header.component.ts
│   │   ├── pages/
│   │   │   ├── home/
│   │   │   │   └── home.component.ts
│   │   │   ├── dashboard/
│   │   │   │   └── dashboard.component.ts
│   │   │   └── invitation/
│   │   │       └── invitation.component.ts
│   │   ├── app.component.ts
│   │   ├── app.routes.ts
│   │   └── app.config.ts
│   ├── styles.scss          # Styles globaux avec thème doré
│   ├── index.html
│   └── main.ts
├── public/
│   ├── favicon.ico
│   ├── logo.png            # Logo Smart Invite
│   └── wedding-theme.jpg   # Image de thème mariage
├── angular.json
├── package.json
└── tsconfig.json
```

## 🎯 Routes

- `/` - Page d'accueil
- `/dashboard` - Tableau de bord
- `/invitations/:token` - Page de réponse aux invitations

## 🛠️ Technologies Utilisées

- **Angular 19** - Framework frontend
- **TypeScript** - Langage de programmation
- **SCSS** - Préprocesseur CSS
- **Standalone Components** - Architecture moderne d'Angular
- **Signals** - Gestion d'état réactive

## 🎨 Personnalisation

### Modifier les couleurs

Éditez les variables SCSS dans `src/styles.scss` :

```scss
$primary-gold: #D4AF37;
$light-gold: #F4E4C1;
$dark-bg: #1A1A1A;
```

### Modifier les polices

Les polices sont importées depuis Google Fonts dans `src/styles.scss` :

```scss
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Lato:wght@300;400;500;700&display=swap');
```

## 📱 Responsive Design

L'application est entièrement responsive et fonctionne sur :
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

## 🔒 Sécurité

- Données sécurisées et chiffrées
- Pas de partage de données personnelles
- Validation des formulaires côté client

## 📝 Licence

Tous droits réservés © 2025 Smart Invite

## 👥 Support

Pour toute question ou support, contactez-nous à contact@example.com

---

**Créé avec ❤️ pour les couples heureux** 💍
