"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import type { BillingPayerApi, ClientPayerAssignmentApi } from "@/lib/db/billing.mapper";
import { toast } from "sonner";

interface ClientInsuranceTabProps {
  clientId: string;
}

interface AssignmentWithPayer extends ClientPayerAssignmentApi {
  payer?: {
    id: string;
    name: string;
    payer_type: string;
    state: string | null;
  };
}

export function ClientInsuranceTab({ clientId }: ClientInsuranceTabProps) {
  const [assignments, setAssignments] = React.useState<AssignmentWithPayer[]>([]);
  const [payers, setPayers] = React.useState<BillingPayerApi[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingAssignment, setEditingAssignment] = React.useState<AssignmentWithPayer | null>(null);

  const [selectedPayerId, setSelectedPayerId] = React.useState("");
  const [memberId, setMemberId] = React.useState("");
  const [groupNumber, setGroupNumber] = React.useState("");
  const [isPrimary, setIsPrimary] = React.useState(true);
  const [authorizationNumber, setAuthorizationNumber] = React.useState("");
  const [authorizedUnits, setAuthorizedUnits] = React.useState("");
  const [authorizationStart, setAuthorizationStart] = React.useState("");
  const [authorizationEnd, setAuthorizationEnd] = React.useState("");
  const [effectiveDate, setEffectiveDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );

  React.useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        const [assignmentsRes, payersRes] = await Promise.all([
          fetch(`/api/billing/client-payer-assignments?clientId=${clientId}`),
          fetch("/api/billing/payers?isActive=true"),
        ]);

        if (assignmentsRes.ok) {
          const data = await assignmentsRes.json();
          setAssignments(data.data ?? []);
        }

        if (payersRes.ok) {
          const data = await payersRes.json();
          setPayers(data.data ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        toast.error("Failed to load insurance information");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [clientId]);

  const handleOpenDialog = (assignment?: AssignmentWithPayer) => {
    if (assignment) {
      setEditingAssignment(assignment);
      setSelectedPayerId(assignment.payerId);
      setMemberId(assignment.memberId ?? "");
      setGroupNumber(assignment.groupNumber ?? "");
      setIsPrimary(assignment.isPrimary);
      setAuthorizationNumber(assignment.authorizationNumber ?? "");
      setAuthorizedUnits(assignment.authorizedUnits?.toString() ?? "");
      setAuthorizationStart(assignment.authorizationStart ?? "");
      setAuthorizationEnd(assignment.authorizationEnd ?? "");
      setEffectiveDate(assignment.effectiveDate);
    } else {
      setEditingAssignment(null);
      setSelectedPayerId("");
      setMemberId("");
      setGroupNumber("");
      setIsPrimary(true);
      setAuthorizationNumber("");
      setAuthorizedUnits("");
      setAuthorizationStart("");
      setAuthorizationEnd("");
      setEffectiveDate(new Date().toISOString().split("T")[0]);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        clientId,
        payerId: selectedPayerId,
        memberId: memberId || null,
        groupNumber: groupNumber || null,
        isPrimary,
        authorizationNumber: authorizationNumber || null,
        authorizedUnits: authorizedUnits ? parseFloat(authorizedUnits) : null,
        usedUnits: 0,
        authorizationStart: authorizationStart || null,
        authorizationEnd: authorizationEnd || null,
        effectiveDate,
        endDate: null,
      };

      const url = editingAssignment
        ? `/api/billing/client-payer-assignments/${editingAssignment.id}`
        : "/api/billing/client-payer-assignments";

      const response = await fetch(url, {
        method: editingAssignment ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save assignment");
      }

      toast.success(editingAssignment ? "Assignment updated" : "Assignment created");
      setIsDialogOpen(false);

      const assignmentsRes = await fetch(`/api/billing/client-payer-assignments?clientId=${clientId}`);
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setAssignments(data.data ?? []);
      }
    } catch (err) {
      console.error("Failed to save assignment:", err);
      toast.error("Failed to save assignment");
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm("Delete this payer assignment?")) return;

    try {
      const response = await fetch(`/api/billing/client-payer-assignments/${assignmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete assignment");
      }

      toast.success("Assignment deleted");
      setAssignments(assignments.filter((a) => a.id !== assignmentId));
    } catch (err) {
      console.error("Failed to delete assignment:", err);
      toast.error("Failed to delete assignment");
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getAuthorizationStatus = (assignment: ClientPayerAssignmentApi) => {
    if (!assignment.authorizedUnits) return null;

    const percentage = (assignment.usedUnits / assignment.authorizedUnits) * 100;
    const remaining = assignment.authorizedUnits - assignment.usedUnits;

    const isExpiring =
      assignment.authorizationEnd &&
      new Date(assignment.authorizationEnd) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return { percentage, remaining, isExpiring };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Payer & Insurance</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Medicaid, private insurance, and authorization tracking
          </p>
        </div>
        <Button size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Payer
        </Button>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-neutral-500">No payer assignments yet</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Payer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const authStatus = getAuthorizationStatus(assignment);
            const payerName = assignment.payer?.name ?? "Unknown Payer";
            const payerType = assignment.payer?.payer_type ?? "";

            return (
              <Card key={assignment.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm">{payerName}</CardTitle>
                        {assignment.isPrimary && (
                          <Badge variant="outline" className="text-xs">
                            Primary
                          </Badge>
                        )}
                        {assignment.payer?.state && (
                          <Badge variant="outline" className="text-xs">
                            {assignment.payer.state}
                          </Badge>
                        )}
                      </div>
                      {assignment.memberId && (
                        <p className="text-xs text-neutral-500 mt-1">
                          Member ID: {assignment.memberId}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleOpenDialog(assignment)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600"
                        onClick={() => handleDelete(assignment.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assignment.authorizationNumber && (
                    <div className="space-y-1">
                      <p className="text-xs text-neutral-500">Authorization</p>
                      <p className="text-sm font-medium">{assignment.authorizationNumber}</p>
                      <p className="text-xs text-neutral-500">
                        Valid: {formatDate(assignment.authorizationStart)} -{" "}
                        {formatDate(assignment.authorizationEnd)}
                      </p>
                    </div>
                  )}

                  {authStatus && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-neutral-500">Units Remaining</p>
                        <p className="text-xs font-medium">
                          {authStatus.remaining.toFixed(1)} of {assignment.authorizedUnits} units
                        </p>
                      </div>
                      <Progress value={authStatus.percentage} className="h-2" />
                      {authStatus.percentage > 80 && (
                        <div className="flex items-center gap-2 text-amber-600 text-xs">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Authorization running low</span>
                        </div>
                      )}
                      {authStatus.isExpiring && (
                        <div className="flex items-center gap-2 text-amber-600 text-xs">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Expires within 30 days</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAssignment ? "Edit Payer Assignment" : "Add Payer Assignment"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payer">Payer</Label>
              <Select value={selectedPayerId} onValueChange={setSelectedPayerId}>
                <SelectTrigger id="payer">
                  <SelectValue placeholder="Select payer..." />
                </SelectTrigger>
                <SelectContent>
                  {payers.map((payer) => (
                    <SelectItem key={payer.id} value={payer.id}>
                      {payer.name} {payer.state && `(${payer.state})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="member-id">Member/Medicaid ID</Label>
                <Input
                  id="member-id"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="123456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-number">Group Number</Label>
                <Input
                  id="group-number"
                  value={groupNumber}
                  onChange={(e) => setGroupNumber(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is-primary"
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(checked === true)}
              />
              <Label htmlFor="is-primary" className="cursor-pointer">
                Primary payer
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-number">Authorization Number</Label>
              <Input
                id="auth-number"
                value={authorizationNumber}
                onChange={(e) => setAuthorizationNumber(e.target.value)}
                placeholder="AUTH-12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorized-units">Authorized Units</Label>
              <Input
                id="authorized-units"
                type="number"
                value={authorizedUnits}
                onChange={(e) => setAuthorizedUnits(e.target.value)}
                placeholder="100.0"
                step="0.1"
              />
              <p className="text-xs text-neutral-500">
                Total units (hours/visits) authorized for this period
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="auth-start">Authorization Start</Label>
                <Input
                  id="auth-start"
                  type="date"
                  value={authorizationStart}
                  onChange={(e) => setAuthorizationStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-end">Authorization End</Label>
                <Input
                  id="auth-end"
                  type="date"
                  value={authorizationEnd}
                  onChange={(e) => setAuthorizationEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective-date">Effective Date</Label>
              <Input
                id="effective-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selectedPayerId}>
              {editingAssignment ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
