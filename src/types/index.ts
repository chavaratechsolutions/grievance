export type Role = "student" | "principal" | "grievance_cell" | "admin";

export type GrievanceStatus = 
  | "submitted" 
  | "under_review" 
  | "investigating" 
  | "action_taken" 
  | "resolved" 
  | "rejected";

export type GrievancePriority = "low" | "medium" | "high" | "urgent";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  department: string;
  rollNumber?: string | null;
  isDisabled: boolean;
  createdAt?: any;
}

export interface Grievance {
  id: string;
  title: string;
  category: string;
  department: string;
  description: string;
  status: GrievanceStatus;
  priority: GrievancePriority;
  isAnonymous: boolean;
  submittedByUid: string;
  submitterName?: string; // Hidden in UI if isAnonymous === true to non-admins
  submitterEmail?: string;
  submitterDepartment?: string;
  attachmentUrls?: string[];
  resolutionSummary?: string;
  resolvedBy?: {
    uid: string;
    name: string;
    role: string;
  };
  resolvedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export type TimelineActionType = 
  | "created"
  | "status_change" 
  | "remark" 
  | "investigation" 
  | "action_taken" 
  | "resolution";

export interface TimelineEntry {
  id: string;
  stepNumber: number;
  actionType: TimelineActionType;
  statusFrom?: GrievanceStatus;
  statusTo?: GrievanceStatus;
  remarks: string;
  performedBy: {
    uid: string;
    name: string;
    role: string;
  };
  timestamp: any;
}

export interface SystemSettings {
  categories: string[];
  departments: string[];
  updatedAt?: any;
}

export interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}
