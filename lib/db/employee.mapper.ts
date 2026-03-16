import type { CreateEmployeeInput } from "@/lib/validation/employee.schema";

/** Supabase row shape: snake_case, JSONB for nested objects */
export interface EmployeeRow {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string;
  phone: string;
  dob: string | null;
  ssn: string | null;
  gender: string | null;
  avatar_url: string | null;
  role: "caregiver" | "cna" | "hha" | "lpn" | "rn" | "admin" | "coordinator" | "other";
  status: "active" | "inactive" | "onboarding";
  start_date: string;
  department: string;
  supervisor: string;
  address: AddressRow;
  emergency_contact: EmergencyContactRow;
  pay_rate: number;
  pay_type: "hourly" | "salary" | "per-visit";
  payroll: PayrollRow;
  work_authorization: string | null;
  npi: string | null;
  notes: string | null;
  skills: string[];
  is_archived: boolean;
  registered_at: string;
  last_active_at: string | null;
  created_at: string;
  short_id: string | null;
  updated_at: string;
}

interface AddressRow {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface EmergencyContactRow {
  name: string;
  phone: string;
}

interface PayrollRow {
  bank_account: string;
  routing_number: string;
  bank_name: string;
}

/** API response shape: camelCase */
export interface EmployeeApiShape {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  email: string;
  phone: string;
  dob: string | null;
  ssn: string | null;
  gender: string | null;
  avatarUrl: string | null;
  role: "caregiver" | "cna" | "hha" | "lpn" | "rn" | "admin" | "coordinator" | "other";
  status: "active" | "inactive" | "onboarding";
  startDate: string;
  department: string;
  supervisor: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
  };
  payRate: number;
  payType: "hourly" | "salary" | "per-visit";
  payroll: {
    bankAccount: string;
    routingNumber: string;
    bankName: string;
  };
  workAuthorization: string | null;
  npi: string | null;
  notes: string | null;
  skills: string[];
  services?: { id: string; name: string }[];
  isArchived: boolean;
  registeredAt: string;
  lastActiveAt: string | null;
  shortId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function mapCreateEmployeeToRow(input: CreateEmployeeInput): Omit<EmployeeRow, "id" | "short_id" | "created_at" | "updated_at" | "is_archived" | "registered_at" | "last_active_at"> {
  const row: Omit<EmployeeRow, "id" | "short_id" | "created_at" | "updated_at" | "is_archived" | "registered_at" | "last_active_at"> = {
    first_name: input.firstName,
    last_name: input.lastName,
    middle_name: input.middleName && input.middleName.trim() !== "" ? input.middleName : null,
    email: input.email,
    phone: input.phone,
    dob: input.dob && input.dob.trim() !== "" ? input.dob : null,
    ssn: input.ssn && input.ssn.trim() !== "" ? input.ssn : null,
    gender: input.gender && input.gender.trim() !== "" ? input.gender : null,
    avatar_url: input.avatarUrl && input.avatarUrl.trim() !== "" ? input.avatarUrl : null,
    role: input.role,
    status: input.status ?? "active",
    start_date: input.startDate,
    department: input.department,
    supervisor: input.supervisor,
    address: {
      street: input.address.street,
      city: input.address.city,
      state: input.address.state,
      zip: input.address.zip,
    },
    emergency_contact: {
      name: input.emergencyContact.name,
      phone: input.emergencyContact.phone,
    },
    pay_rate: input.payRate,
    pay_type: input.payType,
    payroll: {
      bank_account: input.payroll?.bankAccount ?? "",
      routing_number: input.payroll?.routingNumber ?? "",
      bank_name: input.payroll?.bankName ?? "",
    },
    work_authorization: input.workAuthorization && input.workAuthorization.trim() !== "" ? input.workAuthorization : null,
    npi: null,
    notes: input.notes && input.notes.trim() !== "" ? input.notes : null,
    skills: input.skills ?? [],
  };
  return row;
}

/** Build row payload for update from API shape (e.g. after PATCH merge). */
export function mapApiShapeToRow(api: EmployeeApiShape): Omit<EmployeeRow, "id" | "short_id" | "created_at"> {
  return {
    first_name: api.firstName,
    last_name: api.lastName,
    middle_name: api.middleName,
    email: api.email,
    phone: api.phone,
    dob: api.dob,
    ssn: api.ssn,
    gender: api.gender,
    avatar_url: api.avatarUrl,
    role: api.role,
    status: api.status,
    start_date: api.startDate,
    department: api.department,
    supervisor: api.supervisor,
    address: {
      street: api.address.street,
      city: api.address.city,
      state: api.address.state,
      zip: api.address.zip,
    },
    emergency_contact: {
      name: api.emergencyContact.name,
      phone: api.emergencyContact.phone,
    },
    pay_rate: api.payRate,
    pay_type: api.payType,
    payroll: {
      bank_account: api.payroll.bankAccount,
      routing_number: api.payroll.routingNumber,
      bank_name: api.payroll.bankName,
    },
    work_authorization: api.workAuthorization,
    npi: api.npi,
    notes: api.notes,
    skills: api.skills,
    is_archived: api.isArchived,
    registered_at: api.registeredAt,
    last_active_at: api.lastActiveAt,
    updated_at: new Date().toISOString(),
  };
}

export function mapRowToEmployee(row: EmployeeRow): EmployeeApiShape {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name,
    email: row.email,
    phone: row.phone,
    dob: row.dob,
    ssn: row.ssn,
    gender: row.gender,
    avatarUrl: row.avatar_url,
    role: row.role,
    status: row.status,
    startDate: row.start_date,
    department: row.department,
    supervisor: row.supervisor,
    address: {
      street: row.address.street,
      city: row.address.city,
      state: row.address.state,
      zip: row.address.zip,
    },
    emergencyContact: {
      name: row.emergency_contact.name,
      phone: row.emergency_contact.phone,
    },
    payRate: row.pay_rate,
    payType: row.pay_type,
    payroll: {
      bankAccount: row.payroll.bank_account,
      routingNumber: row.payroll.routing_number,
      bankName: row.payroll.bank_name,
    },
    workAuthorization: row.work_authorization,
    npi: row.npi,
    notes: row.notes,
    skills: row.skills,
    isArchived: row.is_archived,
    registeredAt: row.registered_at,
    lastActiveAt: row.last_active_at,
    shortId: row.short_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
