export interface AuthCarouselSlide {
  image: string;
  alt: string;
  title: string;
  description: string;
}

export const AUTH_CAROUSEL_SLIDES: AuthCarouselSlide[] = [
  {
    image: 'img/pic_wedding.webp',
    alt: 'Wedding celebration',
    title: 'Mariage',
    description: 'Invitez vos proches à célébrer le plus beau jour de votre vie avec une invitation élégante'
  },
  {
    image: 'img/pic_engagement.avif',
    alt: 'Engagement celebration',
    title: 'Fiançailles',
    description: 'Annoncez votre engagement avec une invitation élégante'
  },
  {
    image: 'img/pic_anniversary.avif',
    alt: 'Anniversary celebration',
    title: 'Anniversaire de mariage',
    description: 'Célébrez vos moments précieux avec une touche raffinée'
  },
  {
    image: 'img/pic_birthday.webp',
    alt: 'Birthday celebration',
    title: 'Anniversaire',
    description: 'Créez des invitations chaleureuses pour vos proches'
  },
  {
    image: 'img/event_pro.jpg',
    alt: 'Business event',
    title: 'Événement professionnel',
    description: 'Organisez vos réceptions et rencontres avec simplicité'
  }
];
