"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, Save, Loader2, FileText, CreditCard, Building2 } from "lucide-react";
import type { BillingProviderConfigApi } from "@/lib/db/billing.mapper";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

type BillingMode = "private_pay" | "medicaid" | "insurance" | "hybrid";

const BILLING_MODES: {
  value: BillingMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "private_pay",
    label: "Private Pay",
    description: "Clients pay directly. Simple invoicing, no insurance claims.",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    value: "medicaid",
    label: "Medicaid / HCBS",
    description: "Submit 837P claims to state Medicaid programs.",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    value: "insurance",
    label: "Private Insurance",
    description: "Bill commercial insurance plans via clearinghouse.",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    value: "hybrid",
    label: "Hybrid",
    description: "Mix of private pay, Medicaid, and insurance clients.",
    icon: <FileText className="h-5 w-5" />,
  },
];

const needsNpi = (mode: BillingMode) =>
  mode === "medicaid" || mode === "insurance" || mode === "hybrid";

const needsMedicaid = (mode: BillingMode) =>
  mode === "medicaid" || mode === "hybrid";

export function ProviderConfig() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [billingMode, setBillingMode] = React.useState<BillingMode>("private_pay");

  const [providerName, setProviderName] = React.useState("");
  const [npi, setNpi] = React.useState("");
  const [taxId, setTaxId] = React.useState("");
  const [taxonomyCode, setTaxonomyCode] = React.useState("");
  const [billingStreet, setBillingStreet] = React.useState("");
  const [billingCity, setBillingCity] = React.useState("");
  const [billingState, setBillingState] = React.useState("");
  const [billingZip, setBillingZip] = React.useState("");
  const [billingPhone, setBillingPhone] = React.useState("");
  const [billingContactName, setBillingContactName] = React.useState("");
  const [stateProviderIds, setStateProviderIds] = React.useState<
    Array<{ state: string; providerId: string }>
  >([]);
  const [ediSubmitterId, setEdiSubmitterId] = React.useState("");
  const [ediReceiverId, setEdiReceiverId] = React.useState("");

  React.useEffect(() => {
    async function fetchConfig() {
      try {
        setIsLoading(true);
        const response = await apiFetch("/api/billing/provider-config");

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || "Failed to fetch provider config");
        }

        const result = await response.json();
        const data = result.data as BillingProviderConfigApi;

        setProviderName(data.providerName ?? "");
        setNpi(data.npi ?? "");
        setTaxId(data.taxId ?? "");
        setTaxonomyCode(data.taxonomyCode ?? "");
        setBillingStreet(data.billingAddress?.street ?? "");
        setBillingCity(data.billingAddress?.city ?? "");
        setBillingState(data.billingAddress?.state ?? "");
        setBillingZip(data.billingAddress?.zip ?? "");
        setBillingPhone(data.billingPhone ?? "");
        setBillingContactName(data.billingContactName ?? "");
        setEdiSubmitterId(data.ediSubmitterId ?? "");
        setEdiReceiverId(data.ediReceiverId ?? "");

        const stateIds = Object.entries(data.stateProviderIds ?? {}).map(
          ([state, providerId]) => ({ state, providerId })
        );
        setStateProviderIds(stateIds);

        // Infer billing mode from saved data
        if (data.npi && stateIds.length > 0) {
          setBillingMode("medicaid");
        } else if (data.npi) {
          setBillingMode("insurance");
        } else {
          setBillingMode("private_pay");
        }
      } catch (err) {
        console.error("Failed to fetch provider config:", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to load billing configuration"
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchConfig();
  }, []);

  const handleAddStateProviderId = () => {
    setStateProviderIds([...stateProviderIds, { state: "", providerId: "" }]);
  };

  const handleRemoveStateProviderId = (index: number) => {
    setStateProviderIds(stateProviderIds.filter((_, i) => i !== index));
  };

  const handleStateProviderChange = (
    index: number,
    field: "state" | "providerId",
    value: string
  ) => {
    const updated = [...stateProviderIds];
    updated[index][field] = value;
    setStateProviderIds(updated);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const stateIdsObject = stateProviderIds.reduce(
        (acc, item) => {
          if (item.state && item.providerId) acc[item.state] = item.providerId;
          return acc;
        },
        {} as Record<string, string>
      );

      const response = await apiFetch("/api/billing/provider-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerName,
          npi: needsNpi(billingMode) ? npi : "",
          taxId,
          taxonomyCode: taxonomyCode || null,
          billingAddress: {
            street: billingStreet,
            city: billingCity,
            state: billingState,
            zip: billingZip,
          },
          billingPhone: billingPhone || null,
          billingContactName: billingContactName || null,
          stateProviderIds: needsMedicaid(billingMode) ? stateIdsObject : {},
          ediSubmitterId: needsNpi(billingMode) ? ediSubmitterId || null : null,
          ediReceiverId: needsNpi(billingMode) ? ediReceiverId || null : null,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save configuration");
      }

      toast.success("Billing configuration saved");
    } catch (err) {
      console.error("Failed to save provider config:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save billing configuration"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <>
      {/* Billing Mode */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="flex flex-col space-y-1">
          <h3 className="font-semibold">Billing Mode</h3>
          <p className="text-muted-foreground text-sm">
            Select how your agency bills for services. This determines which fields are required.
          </p>
        </div>
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {BILLING_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setBillingMode(mode.value)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                  billingMode === mode.value
                    ? "border-foreground bg-neutral-50"
                    : "border-border hover:border-neutral-400 hover:bg-neutral-50/50"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 shrink-0",
                    billingMode === mode.value
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {mode.icon}
                </span>
                <div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      billingMode === mode.value
                        ? "text-foreground"
                        : "text-neutral-700"
                    )}
                  >
                    {mode.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {mode.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Separator className="my-10" />

      {/* Provider / Agency Information */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="flex flex-col space-y-1">
          <h3 className="font-semibold">
            {needsNpi(billingMode) ? "Provider Information" : "Agency Information"}
          </h3>
          <p className="text-muted-foreground text-sm">
            {needsNpi(billingMode)
              ? "Required for submitting claims and identifying your agency to payers."
              : "Basic information used on invoices and client communications."}
          </p>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="provider-name">
                {needsNpi(billingMode) ? "Provider / Agency Name" : "Agency Name"}
              </Label>
              <Input
                id="provider-name"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="Your Home Care Agency"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tax-id">Tax ID (EIN)</Label>
              <Input
                id="tax-id"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="12-3456789"
              />
            </div>

            {needsNpi(billingMode) && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="npi">
                    NPI <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="npi"
                    value={npi}
                    onChange={(e) => setNpi(e.target.value)}
                    placeholder="1234567890"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    10-digit National Provider Identifier
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="taxonomy">Taxonomy Code</Label>
                  <Input
                    id="taxonomy"
                    value={taxonomyCode}
                    onChange={(e) => setTaxonomyCode(e.target.value)}
                    placeholder="251E00000X"
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g. 251E00000X for Home Health Agency
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Separator className="my-10" />

      {/* Billing Address */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="flex flex-col space-y-1">
          <h3 className="font-semibold">Billing Address</h3>
          <p className="text-muted-foreground text-sm">
            Address used on invoices
            {needsNpi(billingMode) ? " and claims submission" : ""}.
          </p>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={billingStreet}
              onChange={(e) => setBillingStreet(e.target.value)}
              placeholder="123 Main St"
            />
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={billingCity}
                onChange={(e) => setBillingCity(e.target.value)}
                placeholder="Boston"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={billingState}
                onChange={(e) => setBillingState(e.target.value)}
                placeholder="MA"
                maxLength={2}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={billingZip}
                onChange={(e) => setBillingZip(e.target.value)}
                placeholder="02101"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="billing-phone">Billing Phone</Label>
              <Input
                id="billing-phone"
                value={billingPhone}
                onChange={(e) => setBillingPhone(e.target.value)}
                placeholder="555-0100"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact">Billing Contact Name</Label>
              <Input
                id="contact"
                value={billingContactName}
                onChange={(e) => setBillingContactName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Medicaid-only sections */}
      {needsMedicaid(billingMode) && (
        <>
          <Separator className="my-10" />

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            <div className="flex flex-col space-y-1">
              <h3 className="font-semibold">State Medicaid Provider IDs</h3>
              <p className="text-muted-foreground text-sm">
                Per-state Medicaid provider enrollment numbers.
              </p>
            </div>
            <div className="space-y-6 lg:col-span-2">
              {stateProviderIds.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">
                  No state provider IDs configured yet.
                </p>
              )}
              {stateProviderIds.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Input
                    value={item.state}
                    onChange={(e) =>
                      handleStateProviderChange(index, "state", e.target.value)
                    }
                    placeholder="MA"
                    maxLength={2}
                    className="w-24 uppercase"
                  />
                  <Input
                    value={item.providerId}
                    onChange={(e) =>
                      handleStateProviderChange(index, "providerId", e.target.value)
                    }
                    placeholder="Provider ID"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStateProviderId(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={handleAddStateProviderId}>
                <Plus className="h-4 w-4" />
                Add State
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Insurance/EDI sections */}
      {needsNpi(billingMode) && (
        <>
          <Separator className="my-10" />

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            <div className="flex flex-col space-y-1">
              <h3 className="font-semibold">EDI Settings</h3>
              <p className="text-muted-foreground text-sm">
                Electronic data interchange IDs for 837P claims submission.
              </p>
            </div>
            <div className="space-y-6 lg:col-span-2">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edi-submitter">EDI Submitter ID</Label>
                  <Input
                    id="edi-submitter"
                    value={ediSubmitterId}
                    onChange={(e) => setEdiSubmitterId(e.target.value)}
                    placeholder="ISA segment submitter ID"
                  />
                  <p className="text-xs text-muted-foreground">
                    For ISA06 segment (sender ID)
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edi-receiver">EDI Receiver ID</Label>
                  <Input
                    id="edi-receiver"
                    value={ediReceiverId}
                    onChange={(e) => setEdiReceiverId(e.target.value)}
                    placeholder="ISA segment receiver ID"
                  />
                  <p className="text-xs text-muted-foreground">
                    For ISA08 segment (receiver ID)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Save */}
      <Separator className="my-10" />
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold max-sm:w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </>
  );
}
