// =============================================================================
// Database Row Types (snake_case, as returned from Supabase)
// =============================================================================

export interface EVVVisitRow {
  id: string;
  employee_id: string;
  client_id: string;
  service_type_id: string;
  funding_source_id: string;
  scheduled_start: string; // ISO timestamp
  scheduled_end: string;
  clock_in: string | null;
  clock_out: string | null;
  break_minutes: number;
  overtime_minutes: number;
  gps_status: "verified" | "outside" | "missing";
  gps_distance_meters: number | null;
  arrival_status: "on-time" | "late" | "no-show";
  verification_status: "pending" | "verified" | "exception";
  timesheet_status: "pending" | "approved" | "flagged";
  payment_status?: "unpaid" | "paid" | "processing"; // Optional until migration is run
  care_notes_completed: boolean;
  care_notes_text: string | null;
  signature_captured: boolean;
  created_at: string;
  updated_at: string;
}

export interface EVVGPSCaptureRow {
  id: string;
  visit_id: string;
  capture_type: "clock_in" | "clock_out";
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  captured_at: string; // ISO timestamp
  created_at: string;
}

export interface EVVExceptionRow {
  id: string;
  visit_id: string;
  type: string;
  severity: "warning" | "error" | "critical";
  description: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

export interface EVVCorrectionRow {
  id: string;
  visit_id: string;
  field_corrected: "clock_in" | "clock_out";
  original_value: string | null;
  new_value: string;
  reason: string;
  corrected_by: string;
  created_at: string;
}

export interface EVVAuditLogRow {
  id: string;
  visit_id: string;
  event_type: "create" | "clock_in" | "clock_out" | "edit" | "resolve" | "approve" | "flag" | "override";
  label: string;
  detail: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface EVVServiceTypeRow {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface EVVFundingSourceRow {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface EVVSettingsRow {
  id: string;
  geofence_radius_meters: number;
  allow_early_clock_in: boolean;
  early_clock_in_minutes: number;
  grace_period_minutes: number;
  late_arrival_threshold_minutes: number;
  require_shift_to_exist: boolean;
  manual_edits_permission: "admin" | "manager" | "both";
  alert_late_clock_in: boolean;
  alert_no_show: boolean;
  alert_outside_zone: boolean;
  alert_missing_notes: boolean;
  billing_export_format: "medicaid" | "hcbs" | "regional-center" | "idd" | "custom";
  audit_retention_years: number;
  updated_at: string;
}

// =============================================================================
// Joined Query Row (for main EVV list with employee/client/lookups)
// =============================================================================

export interface EVVVisitJoinedRow extends EVVVisitRow {
  employee_first_name: string;
  employee_last_name: string;
  employee_avatar_url: string | null;
  employee_pay_rate: number;
  employee_pay_type: "hourly" | "salary" | "per-visit";
  client_first_name: string;
  client_last_name: string;
  client_avatar_url: string | null;
  client_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  service_type_name: string;
  funding_source_name: string;
  exceptions: EVVExceptionRow[];
}

// =============================================================================
// Timesheet Entry Type (with pay details)
// =============================================================================

export interface TimesheetEntry {
  id: string;
  shiftDate: string; // ISO date (YYYY-MM-DD)
  weekStart: string; // ISO date (Monday of the week)
  weekEnd: string; // ISO date (Sunday of the week)
  caregiver: {
    id: string;
    name: string;
    payRate: number;
    payType: "hourly" | "salary" | "per-visit";
  };
  client: {
    id: string;
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  overtimeMinutes: number;
  billableHours: number;
  overtimeHours: number;
  payAmount: number;
  serviceType: string;
  fundingSource: string;
  paymentStatus: "unpaid" | "paid" | "processing";
  timesheetStatus: "pending" | "approved" | "flagged";
  verificationStatus: "pending" | "verified" | "exception";
}

// =============================================================================
// Mapper Functions: DB Row → TimeClockEntry (Frontend API Shape)
// =============================================================================

export interface TimeClockEntry {
  id: string;
  caregiver: {
    name: string;
    id: string;
    image?: string;
  };
  client: {
    name: string;
    id: string;
    image?: string;
  };
  shiftTime: {
    start: string;
    end: string;
  };
  clockIn?: string;
  clockOut?: string;
  breaks: number;
  overtime: number;
  duration?: number;
  gpsStatus: "verified" | "outside" | "missing";
  gpsDistance?: number;
  arrivalStatus: "on-time" | "late" | "no-show";
  timesheetStatus: "pending" | "approved" | "flagged";
  verificationStatus: "pending" | "verified" | "exception";
  serviceType: string;
  fundingSource: string;
  exceptions: Array<{
    id: string;
    type: string;
    severity: "warning" | "error" | "critical";
    is_resolved: boolean;
  }>;
  careNotesCompleted: boolean;
  signatureCaptured: boolean;
  payRate?: number;
  payType?: "hourly" | "salary" | "per-visit";
  payAmount?: number;
  paymentStatus?: "unpaid" | "paid" | "processing";
  clientAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export function mapVisitRowToTimeClockEntry(row: EVVVisitJoinedRow): TimeClockEntry {
  return {
    id: row.id,
    caregiver: {
      id: row.employee_id,
      name: `${row.employee_first_name} ${row.employee_last_name}`,
      image: row.employee_avatar_url ?? undefined,
    },
    client: {
      id: row.client_id,
      name: `${row.client_first_name} ${row.client_last_name}`,
      image: row.client_avatar_url ?? undefined,
    },
    shiftTime: {
      start: row.scheduled_start,
      end: row.scheduled_end,
    },
    clockIn: row.clock_in ?? undefined,
    clockOut: row.clock_out ?? undefined,
    breaks: row.break_minutes,
    overtime: row.overtime_minutes,
    duration: calculateDuration(row.clock_in, row.clock_out, row.break_minutes),
    gpsStatus: row.gps_status,
    gpsDistance: row.gps_distance_meters ?? undefined,
    arrivalStatus: row.arrival_status,
    timesheetStatus: row.timesheet_status,
    verificationStatus: row.verification_status,
    serviceType: row.service_type_name,
    fundingSource: row.funding_source_name,
    exceptions: row.exceptions.map((ex) => ({
      id: ex.id,
      type: ex.type,
      severity: ex.severity,
      is_resolved: ex.is_resolved,
    })),
    careNotesCompleted: row.care_notes_completed,
    signatureCaptured: row.signature_captured,
  };
}

function calculateDuration(
  clockIn: string | null,
  clockOut: string | null,
  breakMinutes: number
): number | undefined {
  if (!clockIn || !clockOut) return undefined;
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
  const totalMinutes = Math.floor((end - start) / 60000);
  return Math.max(0, totalMinutes - breakMinutes);
}

// =============================================================================
// Mapper: TimeClockEntry → Insert Row (for creating visits)
// =============================================================================

export interface CreateEVVVisitInput {
  employeeId: string;
  clientId: string;
  serviceTypeId: string;
  fundingSourceId: string;
  scheduledStart: string; // ISO
  scheduledEnd: string;
}

export function mapCreateVisitToRow(
  input: CreateEVVVisitInput
): Omit<EVVVisitRow, "id" | "created_at" | "updated_at"> {
  return {
    employee_id: input.employeeId,
    client_id: input.clientId,
    service_type_id: input.serviceTypeId,
    funding_source_id: input.fundingSourceId,
    scheduled_start: input.scheduledStart,
    scheduled_end: input.scheduledEnd,
    clock_in: null,
    clock_out: null,
    break_minutes: 0,
    overtime_minutes: 0,
    gps_status: "missing",
    gps_distance_meters: null,
    arrival_status: "on-time",
    verification_status: "pending",
    timesheet_status: "pending",
    care_notes_completed: false,
    care_notes_text: null,
    signature_captured: false,
  };
}

// =============================================================================
// EVV Settings Mapper
// =============================================================================

export interface EVVSettingsApiShape {
  geofenceRadius: number;
  allowEarlyClockIn: boolean;
  earlyClockInMinutes: number;
  gracePeriodMinutes: number;
  lateArrivalThresholdMinutes: number;
  requireShiftToExist: boolean;
  manualEditsPermission: "admin" | "manager" | "both";
  alertRules: {
    lateClockIn: boolean;
    noShow: boolean;
    outsideZone: boolean;
    missingNotes: boolean;
  };
  exceptionThresholds: {
    lateArrivalMinutes: number;
    geofenceDistanceMeters: number;
  };
  serviceTypes: string[];
  fundingSources: string[];
  billingExportFormat: "medicaid" | "hcbs" | "regional-center" | "idd" | "custom";
  auditRetentionYears: number;
}

export function mapSettingsRowToApi(
  row: EVVSettingsRow,
  serviceTypes: EVVServiceTypeRow[],
  fundingSources: EVVFundingSourceRow[]
): EVVSettingsApiShape {
  return {
    geofenceRadius: row.geofence_radius_meters,
    allowEarlyClockIn: row.allow_early_clock_in,
    earlyClockInMinutes: row.early_clock_in_minutes,
    gracePeriodMinutes: row.grace_period_minutes,
    lateArrivalThresholdMinutes: row.late_arrival_threshold_minutes,
    requireShiftToExist: row.require_shift_to_exist,
    manualEditsPermission: row.manual_edits_permission,
    alertRules: {
      lateClockIn: row.alert_late_clock_in,
      noShow: row.alert_no_show,
      outsideZone: row.alert_outside_zone,
      missingNotes: row.alert_missing_notes,
    },
    exceptionThresholds: {
      lateArrivalMinutes: row.late_arrival_threshold_minutes,
      geofenceDistanceMeters: row.geofence_radius_meters,
    },
    serviceTypes: serviceTypes.filter((s) => s.is_active).map((s) => s.name),
    fundingSources: fundingSources.filter((f) => f.is_active).map((f) => f.name),
    billingExportFormat: row.billing_export_format,
    auditRetentionYears: row.audit_retention_years,
  };
}

export function mapSettingsApiToRow(
  api: EVVSettingsApiShape
): Omit<EVVSettingsRow, "id" | "updated_at"> {
  return {
    geofence_radius_meters: api.geofenceRadius,
    allow_early_clock_in: api.allowEarlyClockIn,
    early_clock_in_minutes: api.earlyClockInMinutes,
    grace_period_minutes: api.gracePeriodMinutes,
    late_arrival_threshold_minutes: api.lateArrivalThresholdMinutes,
    require_shift_to_exist: api.requireShiftToExist,
    manual_edits_permission: api.manualEditsPermission,
    alert_late_clock_in: api.alertRules.lateClockIn,
    alert_no_show: api.alertRules.noShow,
    alert_outside_zone: api.alertRules.outsideZone,
    alert_missing_notes: api.alertRules.missingNotes,
    billing_export_format: api.billingExportFormat,
    audit_retention_years: api.auditRetentionYears,
  };
}

// =============================================================================
// Mapper: EVVVisitJoinedRow → TimesheetEntry (with pay calculations)
// =============================================================================

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

function getSunday(date: Date): Date {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

function calculateBillableHours(
  clockIn: string,
  clockOut: string,
  breakMinutes: number
): number {
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
  const totalMinutes = Math.floor((end - start) / 60000);
  const billableMinutes = Math.max(0, totalMinutes - breakMinutes);
  return parseFloat((billableMinutes / 60).toFixed(2));
}

function calculatePayAmount(
  billableHours: number,
  overtimeHours: number,
  payRate: number,
  payType: "hourly" | "salary" | "per-visit"
): number {
  if (payType === "per-visit") {
    return payRate;
  }
  
  if (payType === "salary") {
    // Annual salary / 2080 hours per year
    const hourlyEquivalent = payRate / 2080;
    const regularPay = (billableHours - overtimeHours) * hourlyEquivalent;
    const overtimePay = overtimeHours * hourlyEquivalent * 1.5;
    return parseFloat((regularPay + overtimePay).toFixed(2));
  }
  
  // Hourly pay
  const regularHours = billableHours - overtimeHours;
  const regularPay = regularHours * payRate;
  const overtimePay = overtimeHours * payRate * 1.5;
  return parseFloat((regularPay + overtimePay).toFixed(2));
}

export function mapVisitToTimesheetEntry(row: EVVVisitJoinedRow): TimesheetEntry {
  if (!row.clock_in || !row.clock_out) {
    throw new Error("Cannot create timesheet entry without clock_in and clock_out");
  }
  
  const shiftDate = new Date(row.scheduled_start);
  const weekStart = getMonday(shiftDate);
  const weekEnd = getSunday(shiftDate);
  
  const billableHours = calculateBillableHours(
    row.clock_in,
    row.clock_out,
    row.break_minutes
  );
  const overtimeHours = parseFloat((row.overtime_minutes / 60).toFixed(2));
  
  const payAmount = calculatePayAmount(
    billableHours,
    overtimeHours,
    row.employee_pay_rate,
    row.employee_pay_type
  );
  
  return {
    id: row.id,
    shiftDate: shiftDate.toISOString().split("T")[0],
    weekStart: weekStart.toISOString().split("T")[0],
    weekEnd: weekEnd.toISOString().split("T")[0],
    caregiver: {
      id: row.employee_id,
      name: `${row.employee_first_name} ${row.employee_last_name}`,
      payRate: row.employee_pay_rate,
      payType: row.employee_pay_type,
    },
    client: {
      id: row.client_id,
      name: `${row.client_first_name} ${row.client_last_name}`,
      address: row.client_address,
    },
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    breakMinutes: row.break_minutes,
    overtimeMinutes: row.overtime_minutes,
    billableHours,
    overtimeHours,
    payAmount,
    serviceType: row.service_type_name,
    fundingSource: row.funding_source_name,
    paymentStatus: row.payment_status ?? "unpaid", // Default to unpaid if column doesn't exist
    timesheetStatus: row.timesheet_status,
    verificationStatus: row.verification_status,
  };
}
