// Document record for candidates
export interface CandidateDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedDate: string;
  uploadedBy?: string;
  expiryDate?: string;
  status?: 'pending' | 'verified' | 'rejected';
  fileUrl?: string;
  complianceStepId?: string;
}

// Activity log entry
export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  action: string;
  description: string;
  performedBy?: string;
  metadata?: Record<string, any>;
}

// Workflow configuration
export interface WorkflowConfig {
  configured: boolean;
  selectedStepIds: string[];
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  avatarUrl: string | null;
  currentPhaseId: string | null;
  currentStageLabel: string | null;
  onboardingStatus: 'active' | 'completed' | 'withdrawn';
  workflowConfig: WorkflowConfig | null;
  stepStatuses: Record<string, string>;
  documents: CandidateDocument[];
  activityLog: ActivityLogEntry[];
  createdAt: string;
  updatedAt: string;
}
