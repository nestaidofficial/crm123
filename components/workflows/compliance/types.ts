// Compliance Workflow Types
// Premium compliance automation system for caregiver onboarding

export type StepStatus =
  | 'not_started'      // Gray - locked/not accessible
  | 'waiting'          // Yellow - sent but not received
  | 'uploaded'         // Blue - docs present, needs review
  | 'verified'         // Green - admin approved
  | 'blocked';         // Red - fails compliance

export type PhaseStatus = 'complete' | 'in_progress' | 'locked' | 'blocked';

export type OverallStatus = 'in_progress' | 'blocked' | 'ready_to_assign';

export type DocumentStatus = 'pending_review' | 'verified' | 'rejected' | 'expired';

export type DocumentType =
  | 'application'
  | 'cori'
  | 'sori'
  | 'training'
  | 'i9'
  | 'policy'
  | 'emergency'
  | 'w4'
  | 'direct_deposit'
  | 'offer_letter'
  | 'reference'
  | 'interview'
  | 'transportation'
  | 'other';

// Document in Compliance Vault
export interface ComplianceDocument {
  id: string;
  name: string;
  type: DocumentType;
  uploadedAt: string;
  uploadedBy: string;
  verifiedAt?: string;
  verifiedBy?: string;
  fileUrl?: string;
  fileSize?: number;
  status: DocumentStatus;
  expiresAt?: string;
  auditNotes?: string;
  stepId: string;
  phaseId: string;
}

// Audit log entry for compliance tracking
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'created' | 'uploaded' | 'verified' | 'rejected' | 'updated' | 'sent' | 'completed';
  performedBy: string;
  details?: string;
  stepId?: string;
  documentId?: string;
  previousStatus?: StepStatus;
  newStatus?: StepStatus;
}

// Compliance gate rule definition
export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  stepIds: string[];
  blocksAssignment: boolean;
  errorMessage: string;
  checkType: 'all_verified' | 'any_verified' | 'custom';
}

// Enhanced step with compliance tracking
export interface ComplianceStep {
  id: string;
  stepNumber: number;
  title: string;
  description?: string;
  status: StepStatus;

  // Document tracking
  documents: ComplianceDocument[];
  requiredDocumentTypes: DocumentType[];

  // Compliance metadata
  isComplianceGate: boolean;
  complianceRuleId?: string;

  // Step details
  method?: string;
  requiredCount?: number;
  completedCount?: number;
  outcome?: string;
  noDocumentUpload?: boolean;

  // Timing
  lastUpdated?: string;
  dueDate?: string;

  // Auto-validation (for Phase 6)
  autoValidation?: boolean;

  // Conditional logic
  conditional?: {
    field: string;
    value: boolean;
    skipIf?: boolean;
  };

  // Audit trail
  auditHistory: AuditLogEntry[];
}

// Phase with enhanced tracking
export interface CompliancePhase {
  id: string;
  phaseNumber: number;
  phaseName: string;
  goal: string;
  status: PhaseStatus;
  phaseStatus: string; // Display text e.g. "Internal review"
  steps: ComplianceStep[];
  lockedUntil?: string; // Phase ID that must complete first

  // Computed properties (calculated by hooks)
  completionPercentage?: number;
  hasBlockers?: boolean;
  blockerCount?: number;
}

// Caregiver info for header
export interface CaregiverInfo {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  location: string;
  startDate: string;
  hireDate?: string;
  overallStatus: OverallStatus;
  caregiverId?: string; // e.g. "CG-2024-0142"
}

// Training folder structure
export interface TrainingFolder {
  caregiverId: string;
  folders: {
    application: ComplianceDocument[];
    coriSori: ComplianceDocument[];
    trainingManual: ComplianceDocument[];
    quizResults: ComplianceDocument[];
    annualRefreshers: ComplianceDocument[];
  };
  lastUpdated: string;
}

// Audit view data
export interface AuditViewData {
  caregiver: CaregiverInfo;
  hiringTimeline: {
    applicationDate?: string;
    interviewDate?: string;
    offerDate?: string;
    coriSubmitDate?: string;
    coriClearDate?: string;
    soriSubmitDate?: string;
    soriClearDate?: string;
    trainingStartDate?: string;
    trainingCompleteDate?: string;
    i9Section1Date?: string;
    i9Section2Date?: string;
    payrollSetupDate?: string;
    readyToAssignDate?: string;
  };
  complianceChecklist: {
    item: string;
    ruleId: string;
    status: 'complete' | 'missing' | 'expired' | 'pending';
    completedDate?: string;
    verifiedBy?: string;
  }[];
  missingItems: string[];
  allDocuments: ComplianceDocument[];
}

// Status config for UI rendering
export interface StepStatusConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  iconName: string;
  label: string;
  description: string;
}

// Compliance gate status (computed)
export interface ComplianceGateStatus {
  rule: ComplianceRule;
  passed: boolean;
  relatedSteps: ComplianceStep[];
}

// Props for main layout component
export interface ComplianceWorkflowLayoutProps {
  caregiver: CaregiverInfo;
  phases: CompliancePhase[];
  onStepStatusChange: (phaseId: string, stepId: string, status: StepStatus) => void;
  onDocumentUpload: (stepId: string, file: File) => void;
  onDocumentVerify: (documentId: string) => void;
  onDocumentReject: (documentId: string, reason?: string) => void;
  onAuditNoteAdd: (stepId: string, note: string) => void;
}

// Props for phase timeline
export interface PhaseTimelineProps {
  phases: CompliancePhase[];
  activePhaseId: string | null;
  onPhaseSelect: (phaseId: string) => void;
}

// Props for step cards panel
export interface StepCardsPanelProps {
  phase: CompliancePhase | null;
  activeStepId: string | null;
  onStepSelect: (stepId: string) => void;
  onStepStatusChange: (stepId: string, status: StepStatus) => void;
  onOpenVault: (stepId: string) => void;
}

// Props for compliance vault drawer
export interface ComplianceVaultDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  step: ComplianceStep | null;
  documents: ComplianceDocument[];
  onDocumentVerify: (documentId: string) => void;
  onDocumentReject: (documentId: string, reason?: string) => void;
  onAuditNoteAdd: (note: string) => void;
}

// Props for assignment gate
export interface AssignmentGateProps {
  gateStatus: ComplianceGateStatus[];
  canAssign: boolean;
  onAssign: () => void;
}
