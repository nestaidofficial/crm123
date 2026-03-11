"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  KanbanStatus,
  KanbanPriority,
  KanbanDomain,
  Employee,
  KANBAN_DOMAIN_OPTIONS,
  NESSSA_EMPLOYEE_MOCK,
} from "@/lib/tasks/nessaKanbanMock";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: KanbanStatus;
  onSubmit: (task: {
    title: string;
    description: string;
    priority: KanbanPriority;
    domain: KanbanDomain;
    assignees: Employee[];
    dueDate: string;
    status: KanbanStatus;
  }) => void;
}

interface FormErrors {
  title?: string;
  priority?: string;
  domain?: string;
  assignees?: string;
}

export function AddTaskModal({
  open,
  onOpenChange,
  status,
  onSubmit,
}: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<KanbanPriority | "">("");
  const [domain, setDomain] = useState<KanbanDomain | "">("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [showEmployeeList, setShowEmployeeList] = useState(false);

  const statusLabels: Record<KanbanStatus, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
  };

  const priorityOptions: { value: KanbanPriority; label: string; color: string }[] = [
    { value: "low", label: "Low", color: "bg-neutral-100 text-neutral-700" },
    { value: "medium", label: "Medium", color: "bg-neutral-100 text-neutral-800" },
    { value: "high", label: "High", color: "bg-neutral-200 text-neutral-900" },
    { value: "urgent", label: "Urgent", color: "bg-black text-white" },
  ];

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
    // Clear error when user selects an employee
    if (errors.assignees) {
      setErrors((prev) => ({ ...prev, assignees: undefined }));
    }
  };

  const removeEmployee = (employeeId: string) => {
    setSelectedEmployees((prev) => prev.filter((id) => id !== employeeId));
  };

  const getSelectedEmployeeObjects = (): Employee[] => {
    return NESSSA_EMPLOYEE_MOCK.filter((emp) =>
      selectedEmployees.includes(emp.id)
    );
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!priority) {
      newErrors.priority = "Priority is required";
    }

    if (!domain) {
      newErrors.domain = "Domain is required";
    }

    if (selectedEmployees.length === 0) {
      newErrors.assignees = "At least one assignee is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    const assignees = getSelectedEmployeeObjects();

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority: priority as KanbanPriority,
      domain: domain as KanbanDomain,
      assignees,
      dueDate: dueDate || "",
      status,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setPriority("");
    setDomain("");
    setSelectedEmployees([]);
    setDueDate("");
    setErrors({});
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form
    setTitle("");
    setDescription("");
    setPriority("");
    setDomain("");
    setSelectedEmployees([]);
    setDueDate("");
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a new task in{" "}
            <span className="font-medium text-neutral-900">
              {statusLabels[status]}
            </span>{" "}
            column.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Enter task title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) {
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }
              }}
              className={cn(errors.title && "border-red-500")}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">
              Priority <span className="text-red-500">*</span>
            </Label>
            <Select
              value={priority}
              onValueChange={(value) => {
                setPriority(value as KanbanPriority);
                if (errors.priority) {
                  setErrors((prev) => ({ ...prev, priority: undefined }));
                }
              }}
            >
              <SelectTrigger
                id="priority"
                className={cn(errors.priority && "border-red-500")}
              >
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs px-2 py-0.5",
                          option.color
                        )}
                      >
                        {option.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.priority && (
              <p className="text-sm text-red-500">{errors.priority}</p>
            )}
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <Label htmlFor="domain">
              Domain <span className="text-red-500">*</span>
            </Label>
            <Select
              value={domain}
              onValueChange={(value) => {
                setDomain(value as KanbanDomain);
                if (errors.domain) {
                  setErrors((prev) => ({ ...prev, domain: undefined }));
                }
              }}
            >
              <SelectTrigger
                id="domain"
                className={cn(errors.domain && "border-red-500")}
              >
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {KANBAN_DOMAIN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.domain && (
              <p className="text-sm text-red-500">{errors.domain}</p>
            )}
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <Label>
              Assignees <span className="text-red-500">*</span>
            </Label>
            <div
              className={cn(
                "border rounded-md p-2 min-h-[42px] cursor-pointer hover:bg-neutral-50 transition-colors",
                errors.assignees && "border-red-500"
              )}
              onClick={() => setShowEmployeeList(!showEmployeeList)}
            >
              {selectedEmployees.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Select assignees...
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {getSelectedEmployeeObjects().map((employee) => (
                    <Badge
                      key={employee.id}
                      variant="secondary"
                      className="flex items-center gap-1 pl-1 pr-2"
                    >
                      <Avatar className="h-5 w-5">
                        {employee.avatar && <AvatarImage src={employee.avatar} alt={employee.name} />}
                        <AvatarFallback className="text-[8px] bg-gradient-to-br from-purple-400 to-blue-400 text-white">
                          {employee.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{employee.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEmployee(employee.id);
                        }}
                        className="ml-1 hover:bg-neutral-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {errors.assignees && (
              <p className="text-sm text-red-500">{errors.assignees}</p>
            )}

            {/* Employee List */}
            {showEmployeeList && (
              <div className="border rounded-md p-2 bg-white shadow-sm">
                <div className="h-[200px] overflow-y-auto">
                  <div className="space-y-2">
                    {NESSSA_EMPLOYEE_MOCK.map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center space-x-3 p-2 hover:bg-neutral-50 rounded cursor-pointer"
                        onClick={() => toggleEmployee(employee.id)}
                      >
                        <Checkbox
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={() => toggleEmployee(employee.id)}
                        />
                        <Avatar className="h-8 w-8">
                          {employee.avatar && <AvatarImage src={employee.avatar} alt={employee.name} />}
                          <AvatarFallback className="text-[10px] bg-gradient-to-br from-purple-400 to-blue-400 text-white">
                            {employee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {employee.name}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {employee.role}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <div className="relative">
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="pl-10"
              />
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Enter task description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-black hover:bg-neutral-800 text-white"
          >
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
