"use client";

import type { ClientFormValues } from "@/lib/clients/schema";
import { NonMedicalCarePlanSection } from "./NonMedicalCarePlanSection";
import { MedicalCarePlanSection } from "./MedicalCarePlanSection";

interface DynamicCarePlanSectionProps {
  careType: ClientFormValues["careType"];
}

export function DynamicCarePlanSection({ careType }: DynamicCarePlanSectionProps) {
  if (careType === "non_medical") {
    return <NonMedicalCarePlanSection />;
  }
  return <MedicalCarePlanSection />;
}
