export type IssueCategory = 'pothole' | 'lighting' | 'trash' | 'water' | 'other';
export type IssueStatus = 'pending' | 'in-progress' | 'resolved';

export interface Location {
  lat: number;
  lng: number;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  status: IssueStatus;
  location: Location;
  address?: string;
  imageUrl?: string;
  managerComment?: string;
  managerPhotoUrl?: string;
  reporterName: string;
  actualReporterName?: string; // Always stores the real name for admins
  userId: string;
  isAnonymous: boolean;
  cpf?: string; 
  createdAt: string;
  updatedAt: string;
  changeRequested?: boolean;
  proposedChanges?: {
    title?: string;
    description?: string;
    category?: IssueCategory;
  };
}

export type UserRole = 'citizen' | 'editor' | 'admin';

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: UserRole;
  cpf?: string;
  phone?: string;
}
