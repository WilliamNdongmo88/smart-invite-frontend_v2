export interface Guest {
  id: string;
  name: string;
  email: string;
  status: 'confirmed' | 'pending' | 'declined';
  dietaryRestrictions?: string;
  plusOne?: boolean;
  responseDate?: string;
}
