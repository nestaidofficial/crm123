import { create } from "zustand";
import { getJSON } from "@/lib/storage";
import type { Employee } from "@/lib/hr/mockEmployees";
import type { EmployeeApiShape } from "@/lib/db/employee.mapper";
import { apiFetch } from "@/lib/api-fetch";
import { logEmployeeActivity } from "@/lib/activity-logger";
import { useAuthStore } from "@/store/useAuthStore";

const DRAFT_KEY = "nessa_employee_draft_v1";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

interface EmployeesState {
  employees: Employee[];
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  hydrate: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  addEmployee: (employee: Partial<Employee>) => Promise<Employee | null>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  getEmployeeById: (id: string) => Employee | undefined;
  getDraft: () => Partial<Employee> | null;
  saveDraft: (draft: Partial<Employee>) => void;
  clearDraft: () => void;
}

/** Convert API shape (camelCase) to Employee interface (camelCase with slightly different structure) */
function apiShapeToEmployee(api: EmployeeApiShape): Employee {
  return {
    id: api.id,
    firstName: api.firstName,
    lastName: api.lastName,
    email: api.email,
    phone: api.phone,
    role: api.role,
    status: api.status,
    startDate: api.startDate,
    department: api.department,
    supervisor: api.supervisor,
    address: api.address,
    emergencyContact: api.emergencyContact,
    payRate: api.payRate,
    payType: api.payType,
    avatar: api.avatarUrl ?? undefined,
    ssn: api.ssn ?? undefined,
    dob: api.dob ?? undefined,
    workAuthorization: api.workAuthorization ?? undefined,
    bankAccount: api.payroll.bankAccount,
    routingNumber: api.payroll.routingNumber,
    bankName: api.payroll.bankName,
    notes: api.notes ?? undefined,
    skills: api.skills,
    documents: [], // Documents loaded separately
    verifications: [], // Verifications loaded separately
  };
}

export const useEmployeesStore = create<EmployeesState>((set, get) => ({
  employees: [],
  hydrated: false,
  loading: false,
  error: null,
  lastFetchedAt: null,

  async hydrate() {
    const state = get();

    // Skip if already loading
    if (state.loading) return;

    // Skip if recently fetched (within TTL) - prevents refetch on navigation
    if (state.hydrated && state.lastFetchedAt) {
      const age = Date.now() - state.lastFetchedAt;
      if (age < CACHE_TTL_MS) return;
    }

    // Guard: require an agency context before fetching — apiFetch adds the
    // x-agency-id header from this value and the API returns 400 without it.
    const agencyId = useAuthStore.getState().currentAgencyId;
    if (!agencyId) return;

    set({ loading: true, error: null });
    try {
      const response = await apiFetch("/api/employees");
      if (!response.ok) {
        throw new Error(`Failed to fetch employees: ${response.statusText}`);
      }

      const json = await response.json();
      const apiEmployees = json.data as EmployeeApiShape[];
      const employees = apiEmployees.map(apiShapeToEmployee);

      set({
        employees,
        hydrated: true,
        loading: false,
        lastFetchedAt: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load employees";
      console.error("Error hydrating employees:", error);
      set({
        error: message,
        loading: false,
        hydrated: true,
        employees: [],
      });
    }
  },

  async forceRefresh() {
    set({ lastFetchedAt: null, hydrated: false });
    return get().hydrate();
  },

  async addEmployee(employee: Partial<Employee>) {
    set({ loading: true, error: null });
    try {
      // Map Employee to CreateEmployeeInput format
      const createInput = {
        firstName: employee.firstName!,
        lastName: employee.lastName!,
        middleName: employee.middleName,
        email: employee.email!,
        phone: employee.phone!,
        dob: employee.dob,
        ssn: employee.ssn,
        gender: employee.gender,
        avatarUrl: employee.avatar,
        role: employee.role!,
        status: employee.status ?? "active",
        startDate: employee.startDate!,
        department: employee.department!,
        supervisor: employee.supervisor!,
        address: employee.address!,
        emergencyContact: employee.emergencyContact!,
        payRate: employee.payRate!,
        payType: employee.payType!,
        payroll: {
          bankAccount: employee.bankAccount ?? "",
          routingNumber: employee.routingNumber ?? "",
          bankName: employee.bankName ?? "",
        },
        workAuthorization: employee.workAuthorization,
        notes: employee.notes,
        skills: employee.skills ?? [],
      };

      const response = await apiFetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createInput),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Failed to create employee");
      }

      const json = await response.json();
      const apiEmployee = json.data as EmployeeApiShape;
      const newEmployee = apiShapeToEmployee(apiEmployee);

      set((state) => ({
        employees: [...state.employees, newEmployee],
        loading: false,
        lastFetchedAt: Date.now(),
      }));

      // Log activity
      logEmployeeActivity(
        "created",
        `${newEmployee.firstName} ${newEmployee.lastName}`,
        "Current User",
        newEmployee.id
      );

      return newEmployee;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create employee";
      console.error("Error adding employee:", error);
      set({ error: message, loading: false });
      return null;
    }
  },

  async updateEmployee(id: string, updates: Partial<Employee>) {
    set({ loading: true, error: null });
    try {
      // Map Employee updates to UpdateEmployeeInput format
      const updateInput: Record<string, unknown> = {};
      if (updates.firstName !== undefined) updateInput.firstName = updates.firstName;
      if (updates.lastName !== undefined) updateInput.lastName = updates.lastName;
      if (updates.middleName !== undefined) updateInput.middleName = updates.middleName;
      if (updates.email !== undefined) updateInput.email = updates.email;
      if (updates.phone !== undefined) updateInput.phone = updates.phone;
      if (updates.dob !== undefined) updateInput.dob = updates.dob;
      if (updates.ssn !== undefined) updateInput.ssn = updates.ssn;
      if (updates.gender !== undefined) updateInput.gender = updates.gender;
      if (updates.avatar !== undefined) updateInput.avatarUrl = updates.avatar;
      if (updates.role !== undefined) updateInput.role = updates.role;
      if (updates.status !== undefined) updateInput.status = updates.status;
      if (updates.startDate !== undefined) updateInput.startDate = updates.startDate;
      if (updates.department !== undefined) updateInput.department = updates.department;
      if (updates.supervisor !== undefined) updateInput.supervisor = updates.supervisor;
      if (updates.address !== undefined) updateInput.address = updates.address;
      if (updates.emergencyContact !== undefined) updateInput.emergencyContact = updates.emergencyContact;
      if (updates.payRate !== undefined) updateInput.payRate = updates.payRate;
      if (updates.payType !== undefined) updateInput.payType = updates.payType;
      if (updates.bankAccount !== undefined || updates.routingNumber !== undefined || updates.bankName !== undefined) {
        const currentEmployee = get().employees.find((e) => e.id === id);
        updateInput.payroll = {
          bankAccount: updates.bankAccount ?? currentEmployee?.bankAccount ?? "",
          routingNumber: updates.routingNumber ?? currentEmployee?.routingNumber ?? "",
          bankName: updates.bankName ?? currentEmployee?.bankName ?? "",
        };
      }
      if (updates.workAuthorization !== undefined) updateInput.workAuthorization = updates.workAuthorization;
      if (updates.notes !== undefined) updateInput.notes = updates.notes;
      if (updates.skills !== undefined) updateInput.skills = updates.skills;

      const response = await apiFetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateInput),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Failed to update employee");
      }

      const json = await response.json();
      const apiEmployee = json.data as EmployeeApiShape;
      const updatedEmployee = apiShapeToEmployee(apiEmployee);

      set((state) => ({
        employees: state.employees.map((emp) =>
          emp.id === id ? updatedEmployee : emp
        ),
        loading: false,
        lastFetchedAt: Date.now(),
      }));

      // Log activity
      logEmployeeActivity(
        "updated",
        `${updatedEmployee.firstName} ${updatedEmployee.lastName}`,
        "Current User",
        updatedEmployee.id
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update employee";
      console.error("Error updating employee:", error);
      set({ error: message, loading: false });
    }
  },

  async deleteEmployee(id: string) {
    set({ loading: true, error: null });
    try {
      const response = await apiFetch(`/api/employees/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Failed to delete employee");
      }

      const deletedEmployee = get().employees.find((emp) => emp.id === id);

      set((state) => ({
        employees: state.employees.filter((emp) => emp.id !== id),
        loading: false,
        lastFetchedAt: Date.now(),
      }));

      // Log activity
      if (deletedEmployee) {
        logEmployeeActivity(
          "deleted",
          `${deletedEmployee.firstName} ${deletedEmployee.lastName}`,
          "Current User",
          id
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete employee";
      console.error("Error deleting employee:", error);
      set({ error: message, loading: false });
    }
  },

  getEmployeeById(id: string) {
    return get().employees.find((emp) => emp.id === id);
  },

  getDraft() {
    return getJSON<Partial<Employee>>(DRAFT_KEY);
  },

  saveDraft(draft: Partial<Employee>) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  },

  clearDraft() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  },
}));
