"use client";

import { Separator } from "@/components/ui/separator";
import type { ClientFormValues } from "@/lib/clients/schema";
import { cn } from "@/lib/utils";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-body-s text-neutral-500 shrink-0">{label}</span>
      <span className={cn("text-body-s text-neutral-900 text-right", !value && "text-neutral-500 italic")}>
        {value ?? "—"}
      </span>
    </div>
  );
}

interface ReviewSummaryProps {
  values: ClientFormValues;
  className?: string;
}

export function ReviewSummary({ values, className }: ReviewSummaryProps) {
  const isMedical = values.careType === "medical";

  return (
    <div className={cn("space-y-6", className)}>
      <section>
        <h3 className="text-body-m font-semibold text-neutral-900 mb-3">Basics</h3>
        <div className="space-y-0">
          <Row label="Care type" value={values.careType === "medical" ? "Medical" : "Non-Medical"} />
          <Row label="Name" value={`${values.firstName} ${values.lastName}`} />
          <Row label="DOB" value={values.dob} />
          <Row label="Gender" value={values.gender} />
          <Row label="Phone" value={values.phone} />
          <Row label="Email" value={values.email} />
        </div>
      </section>

      <Separator className="bg-neutral-200" />

      <section>
        <h3 className="text-body-m font-semibold text-neutral-900 mb-3">Contacts & Address</h3>
        <div className="space-y-0">
          <Row
            label="Address"
            value={`${values.address.street}, ${values.address.city}, ${values.address.state} ${values.address.zip}`}
          />
          <Row label="Primary contact" value={`${values.primaryContact.name} (${values.primaryContact.relation})`} />
          <Row label="Primary phone" value={values.primaryContact.phone} />
          <Row label="Emergency contact" value={values.emergencyContact.name} />
          <Row label="Emergency phone" value={values.emergencyContact.phone} />
          {values.notes ? <Row label="Notes" value={values.notes} /> : null}
        </div>
      </section>

      <Separator className="bg-neutral-200" />

      <section>
        <h3 className="text-body-m font-semibold text-neutral-900 mb-3">Care Plan</h3>
        {isMedical ? (
          <div className="space-y-0">
            <Row label="Type" value="Medical" />
            <Row label="Diagnosis" value={"diagnosis" in values ? values.diagnosis : "—"} />
            <Row label="Physician" value={"physicianName" in values ? values.physicianName : "—"} />
            <Row label="Physician phone" value={"physicianPhone" in values ? values.physicianPhone : "—"} />
            {"medications" in values && values.medications.length > 0 && (
              <div className="pt-1.5">
                <span className="text-body-s text-neutral-500 block mb-1">Medications</span>
                <ul className="text-body-s text-neutral-900 list-disc list-inside space-y-0.5">
                  {values.medications.map((m, i) => (
                    <li key={i}>{`${m.name}, ${m.dose}, ${m.frequency}`}</li>
                  ))}
                </ul>
              </div>
            )}
            {"skilledServices" in values && values.skilledServices.length > 0 && (
              <Row label="Skilled services" value={values.skilledServices.join(", ")} />
            )}
          </div>
        ) : (
          <div className="space-y-0">
            <Row label="Type" value="Non-Medical" />
            {"adlNeeds" in values && values.adlNeeds.length > 0 && (
              <Row label="ADL needs" value={values.adlNeeds.join(", ")} />
            )}
            {"schedulePreferences" in values && (
              <>
                <Row
                  label="Days"
                  value={
                    values.schedulePreferences.daysOfWeek.length > 0
                      ? values.schedulePreferences.daysOfWeek.join(", ")
                      : "—"
                  }
                />
                <Row label="Time window" value={values.schedulePreferences.timeWindow} />
                <Row label="Visit frequency" value={values.schedulePreferences.visitFrequency} />
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
