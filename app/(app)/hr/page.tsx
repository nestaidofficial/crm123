"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Download, UserPlus } from "lucide-react";
import { useEmployeesStore } from "@/store/useEmployeesStore";

const AddEmployeeDialog = dynamic(
  () => import("@/components/hr/add-employee-dialog").then(m => ({ default: m.AddEmployeeDialog })),
  { ssr: false }
);

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getRoleLabel(role: string): string {
  const roleLabels: Record<string, string> = {
    caregiver: "Caregiver",
    cna: "CNA",
    hha: "HHA",
    lpn: "LPN",
    rn: "RN",
    admin: "Admin",
    coordinator: "Coordinator",
  };
  return roleLabels[role] || role;
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" {
  // Keep variant type consistent but rely on className for actual colors
  return "outline";
}

function getStatusBadgeClassName(status: string): string {
  switch (status) {
    case "active":
      // Active - green
      return "bg-neutral-100 text-neutral-900 border border-neutral-200";
    case "onboarding":
      // Onboarding - yellow
      return "bg-neutral-100 text-neutral-700 border border-neutral-200";
    case "inactive":
      // Inactive - grey
      return "bg-neutral-100 text-neutral-500 border border-neutral-200";
    default:
      return "bg-neutral-100 text-neutral-500 border border-neutral-200";
  }
}

export default function HRPage() {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const employees = useEmployeesStore((state) => state.employees);

  const filteredEmployees = useMemo(() => {
    if (!query.trim()) return employees;
    const q = query.toLowerCase();
    return employees.filter((emp) => {
      const name = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const email = emp.email.toLowerCase();
      const phone = emp.phone.toLowerCase();
      const role = getRoleLabel(emp.role).toLowerCase();
      const shortId = (emp.shortId ?? "").toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        role.includes(q) ||
        shortId.includes(q) ||
        emp.department.toLowerCase().includes(q)
      );
    });
  }, [employees, query]);

  const handleRowClick = (employeeId: string) => {
    router.push(`/hr/employees/${employeeId}`);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[16px] font-semibold text-neutral-900">Human Resources</h1>
            <p className="text-[12px] text-neutral-500 font-normal mt-0.5">
              Manage staff, caregivers, and credentials
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="h-8 rounded-full bg-[#FED96A] hover:bg-[#e8c55a] text-neutral-900 text-[12px]">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            <span className="font-medium">Add Employee</span>
          </Button>
        </div>

        <AddEmployeeDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

        <Card className="shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4">
            <CardTitle className="text-[14px] font-semibold">Employee Directory</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-8 h-8 w-56 text-[12px]"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]">
                <Filter className="h-3 w-3" />
                Filters
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]">
                <Download className="h-3 w-3" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            {filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 border border-black/5 mb-3">
                  <UserPlus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-[14px] font-semibold text-neutral-900">
                  {employees.length === 0
                    ? "No employees yet"
                    : "No employees match your search"}
                </h3>
                <p className="text-[12px] text-muted-foreground mt-0.5 max-w-sm">
                  {employees.length === 0
                    ? "Add your first employee to get started. You can import from CSV or add them manually."
                    : "Try adjusting your search query."}
                </p>
                {employees.length === 0 && (
                  <Button onClick={() => setIsDialogOpen(true)} className="mt-4 gap-1.5 h-8 text-[12px]">
                    <Plus className="h-3.5 w-3.5" />
                    Add employee
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="py-2 px-3 text-left">
                        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">
                          Employee
                        </span>
                      </th>
                      <th className="py-2 px-3 text-left">
                        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">
                          Department
                        </span>
                      </th>
                      <th className="py-2 px-3 text-left">
                        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">
                          Start Date
                        </span>
                      </th>
                      <th className="py-2 px-3 text-left">
                        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">
                          Phone
                        </span>
                      </th>
                      <th className="py-2 px-3 text-left">
                        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">
                          Location
                        </span>
                      </th>
                      <th className="py-2 pl-3 pr-0 text-right">
                        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">
                          Status
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {filteredEmployees.map((emp) => (
                      <tr
                        key={emp.id}
                        onClick={() => handleRowClick(emp.id)}
                        className="hover:bg-neutral-25 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={emp.avatar} alt={`${emp.firstName} ${emp.lastName}`} />
                              <AvatarFallback className="bg-neutral-100 text-neutral-700 text-[11px] font-semibold">
                                {getInitials(emp.firstName, emp.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-[13px] font-medium text-neutral-900 flex items-center gap-1.5">
                                {emp.firstName} {emp.lastName}
                                {emp.shortId && (
                                  <span className="text-[10px] font-mono text-neutral-400">{emp.shortId}</span>
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-500">
                                {getRoleLabel(emp.role)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-[12px] text-neutral-900">{emp.department}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-[12px] text-neutral-900">
                            {new Date(emp.startDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-[12px] text-neutral-900">{emp.phone}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-[12px] text-neutral-900">
                            {emp.address.city}, {emp.address.state}
                          </div>
                          <div className="text-[11px] text-neutral-500">{emp.address.zip}</div>
                        </td>
                        <td className="py-2.5 pl-3 pr-0 text-right">
                          <Badge
                            variant={getStatusBadgeVariant(emp.status)}
                            className={getStatusBadgeClassName(emp.status)}
                          >
                            {emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
