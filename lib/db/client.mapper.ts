import type { CreateClientInput } from "@/lib/validation/client.schema";
import type { SavedClient } from "@/lib/clients/schema";

/** Supabase row shape: snake_case, JSONB for nested objects */
export interface ClientRow {
  id: string;
  care_type: "non_medical" | "medical";
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  notes: string | null;
  address: AddressRow;
  primary_contact: PrimaryContactRow;
  emergency_contact: EmergencyContactRow;
  care_plan: NonMedicalCarePlanRow | MedicalCarePlanRow;
  short_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

interface AddressRow {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface PrimaryContactRow {
  name?: string;
  relation?: string;
  phone?: string;
}

interface EmergencyContactRow {
  name: string;
  phone: string;
  relation?: string;
}

interface NonMedicalCarePlanRow {
  adl_needs: string[];
  schedule_preferences: {
    days_of_week: string[];
    time_window: string;
    visit_frequency: string;
  };
}

interface MedicalCarePlanRow {
  diagnosis: string;
  physician: { name: string; phone: string };
  medications: { name: string; dose: string; frequency: string }[];
  skilled_services: string[];
}

/** API response shape: camelCase */
export interface ClientApiShape {
  id: string;
  careType: "non_medical" | "medical";
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  phone: string;
  email: string | null;
  avatarUrl: string | null;
  notes: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  primaryContact: {
    name: string;
    relation: string;
    phone: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relation?: string;
  };
  carePlan: NonMedicalCarePlanApi | MedicalCarePlanApi;
  shortId: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

type NonMedicalCarePlanApi = {
  adlNeeds: string[];
  schedulePreferences: {
    daysOfWeek: string[];
    timeWindow: string;
    visitFrequency: string;
  };
};

type MedicalCarePlanApi = {
  diagnosis: string;
  physician: { name: string; phone: string };
  medications: { name: string; dose: string; frequency: string }[];
  skilledServices: string[];
};

export function mapCreateClientToRow(input: CreateClientInput): Omit<ClientRow, "id" | "short_id" | "created_at" | "updated_at" | "is_archived"> {
  const row: Omit<ClientRow, "id" | "short_id" | "created_at" | "updated_at" | "is_archived"> = {
    care_type: input.careType,
    first_name: input.firstName,
    last_name: input.lastName,
    dob: input.dob,
    gender: input.gender,
    phone: input.phone,
    email: input.email && input.email.trim() !== "" ? input.email : null,
    avatar_url: input.avatarUrl && input.avatarUrl.trim() !== "" ? input.avatarUrl : null,
    notes: input.notes && input.notes.trim() !== "" ? input.notes : null,
    address: {
      street: input.address.street,
      city: input.address.city,
      state: input.address.state,
      zip: input.address.zip,
    },
    primary_contact: {}, // Primary contact stored in client_guardians with is_primary=true
    emergency_contact: {
      name: input.emergencyContact.name,
      phone: input.emergencyContact.phone,
      ...(input.emergencyContact.relation != null && input.emergencyContact.relation !== ""
        ? { relation: input.emergencyContact.relation }
        : {}),
    },
    care_plan: input.careType === "non_medical"
      ? {
          adl_needs: input.adlNeeds ?? [],
          schedule_preferences: {
            days_of_week: input.schedulePreferences.daysOfWeek ?? [],
            time_window: input.schedulePreferences.timeWindow,
            visit_frequency: input.schedulePreferences.visitFrequency,
          },
        }
      : {
          diagnosis: input.diagnosis,
          physician: { name: input.physician.name, phone: input.physician.phone },
          medications: input.medications ?? [],
          skilled_services: input.skilledServices ?? [],
        },
  };
  return row;
}

/** Build row payload for update from API shape (e.g. after PATCH merge). */
export function mapApiShapeToRow(api: ClientApiShape): Omit<ClientRow, "id" | "short_id" | "created_at"> {
  const isNonMedical = api.careType === "non_medical";
  const carePlan = api.carePlan as NonMedicalCarePlanApi | MedicalCarePlanApi;
  return {
    care_type: api.careType,
    first_name: api.firstName,
    last_name: api.lastName,
    dob: api.dob,
    gender: api.gender,
    phone: api.phone,
    email: api.email,
    avatar_url: api.avatarUrl,
    notes: api.notes,
    address: {
      street: api.address.street,
      city: api.address.city,
      state: api.address.state,
      zip: api.address.zip,
    },
    primary_contact: {
      name: api.primaryContact.name,
      relation: api.primaryContact.relation,
      phone: api.primaryContact.phone,
    },
    emergency_contact: {
      name: api.emergencyContact.name,
      phone: api.emergencyContact.phone,
      ...(api.emergencyContact.relation != null ? { relation: api.emergencyContact.relation } : {}),
    },
    care_plan: isNonMedical
      ? {
          adl_needs: (carePlan as NonMedicalCarePlanApi).adlNeeds,
          schedule_preferences: {
            days_of_week: (carePlan as NonMedicalCarePlanApi).schedulePreferences.daysOfWeek,
            time_window: (carePlan as NonMedicalCarePlanApi).schedulePreferences.timeWindow,
            visit_frequency: (carePlan as NonMedicalCarePlanApi).schedulePreferences.visitFrequency,
          },
        }
      : {
          diagnosis: (carePlan as MedicalCarePlanApi).diagnosis,
          physician: (carePlan as MedicalCarePlanApi).physician,
          medications: (carePlan as MedicalCarePlanApi).medications,
          skilled_services: (carePlan as MedicalCarePlanApi).skilledServices,
        },
    is_archived: api.isArchived,
    updated_at: new Date().toISOString(),
  };
}

export function mapRowToClient(row: ClientRow): ClientApiShape {
  const carePlan = row.care_plan as NonMedicalCarePlanRow | MedicalCarePlanRow;
  const isNonMedical = row.care_type === "non_medical";

  return {
    id: row.id,
    careType: row.care_type,
    firstName: row.first_name,
    lastName: row.last_name,
    dob: row.dob,
    gender: row.gender,
    phone: row.phone,
    email: row.email,
    avatarUrl: row.avatar_url,
    notes: row.notes,
    address: {
      street: row.address.street,
      city: row.address.city,
      state: row.address.state,
      zip: row.address.zip,
    },
    primaryContact: {
      name: row.primary_contact?.name ?? "",
      relation: row.primary_contact?.relation ?? "",
      phone: row.primary_contact?.phone ?? "",
    },
    emergencyContact: {
      name: row.emergency_contact.name,
      phone: row.emergency_contact.phone,
      ...(row.emergency_contact.relation != null ? { relation: row.emergency_contact.relation } : {}),
    },
    carePlan: isNonMedical
      ? {
          adlNeeds: (carePlan as NonMedicalCarePlanRow).adl_needs,
          schedulePreferences: {
            daysOfWeek: (carePlan as NonMedicalCarePlanRow).schedule_preferences.days_of_week,
            timeWindow: (carePlan as NonMedicalCarePlanRow).schedule_preferences.time_window,
            visitFrequency: (carePlan as NonMedicalCarePlanRow).schedule_preferences.visit_frequency,
          },
        }
      : {
          diagnosis: (carePlan as MedicalCarePlanRow).diagnosis,
          physician: (carePlan as MedicalCarePlanRow).physician,
          medications: (carePlan as MedicalCarePlanRow).medications,
          skilledServices: (carePlan as MedicalCarePlanRow).skilled_services,
        },
    shortId: row.short_id,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Convert API shape to form/store shape (SavedClient: avatar, physicianName, physicianPhone) */
export function apiShapeToSavedClient(api: ClientApiShape): SavedClient {
  const base = {
    id: api.id,
    shortId: api.shortId ?? undefined,
    careType: api.careType,
    firstName: api.firstName,
    lastName: api.lastName,
    dob: api.dob,
    gender: api.gender,
    phone: api.phone,
    email: api.email ?? undefined,
    avatar: api.avatarUrl ?? undefined,
    address: api.address,
    primaryContact: api.primaryContact,
    emergencyContact: api.emergencyContact,
    notes: api.notes ?? undefined,
  };
  if (api.careType === "non_medical") {
    const cp = api.carePlan as NonMedicalCarePlanApi;
    return { ...base, careType: "non_medical", adlNeeds: cp.adlNeeds, schedulePreferences: cp.schedulePreferences };
  }
  const cp = api.carePlan as MedicalCarePlanApi;
  return {
    ...base,
    careType: "medical",
    diagnosis: cp.diagnosis,
    physicianName: cp.physician.name,
    physicianPhone: cp.physician.phone,
    medications: cp.medications,
    skilledServices: cp.skilledServices,
  };
}
