// =============================================================================
// AI Coverage Coordinator: API Validation Schema
// =============================================================================
// Reuses the frontend Zod schema directly — the API validates the same shape
// the frontend already sends.
// =============================================================================

import { coordinatorSetupSchema } from "@/lib/ai/coordinator-schema";

export const UpdateCoordinatorConfigSchema = coordinatorSetupSchema;

export type UpdateCoordinatorConfigInput = typeof UpdateCoordinatorConfigSchema._output;
