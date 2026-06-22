import { UserProfile } from './types';

export const APP_USERS: Omit<UserProfile, 'uid'>[] = [
  {
    email: 'drptze@gmail.com',
    displayName: 'Administrador Benesse',
    role: 'admin',
    businessUnit: 'Gestão Esportiva'
  },
  {
    email: 'vendedor1@benesse.com.br',
    displayName: 'Vendedor 01',
    role: 'vendor',
    businessUnit: 'Gestão Esportiva'
  },
  {
    email: 'vendedor2@benesse.com.br',
    displayName: 'Vendedor 02',
    role: 'vendor',
    businessUnit: 'Studio de Pilates'
  }
];

export const getProfileByEmail = (email: string | null): UserProfile | null => {
  if (!email) return null;
  const user = APP_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return null;
  return { ...user, uid: email }; // Using email as a stable ID for logic
};
