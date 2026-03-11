// =============================================================================
// AI Receptionist: API Validation Schema
// =============================================================================
// Reuses the frontend Zod schema directly — the API validates the same shape
// the frontend already sends.
// =============================================================================

import { receptionistSetupSchema } from "@/lib/ai/receptionist-schema";

export const UpdateReceptionistConfigSchema = receptionistSetupSchema;

export type UpdateReceptionistConfigInput = typeof UpdateReceptionistConfigSchema._output;
