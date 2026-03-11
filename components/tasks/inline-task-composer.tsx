"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  KanbanStatus,
  KanbanPriority,
  KanbanDomain,
  Employee,
  KanbanTask,
  KANBAN_DOMAIN_OPTIONS,
} from "@/lib/tasks/nessaKanbanMock";
import {
  X,
  Type,
  Users,
  FolderKanban,
  Flag,
  AlignLeft,
  ChevronDown,
  Link2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineTaskComposerProps {
  status: KanbanStatus;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    priority: KanbanPriority;
    domain: KanbanDomain;
    assignees: Employee[];
    dueDate: string;
    links: string[];
    status: KanbanStatus;
  }) => void;
  /** When set, form is prefilled and used for editing (Save instead of Create task) */
  initialTask?: KanbanTask | null;
  /** When true, render only form content (no Card wrapper) for use inside Dialog */
  contentOnly?: boolean;
  /** List of employees to choose from for assignees */
  employees?: Employee[];
}

export function InlineTaskComposer({
  status,
  onClose,
  onSubmit,
  initialTask,
  contentOnly = false,
  employees = [],
}: InlineTaskComposerProps) {
  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [description, setDescription] = useState(initialTask?.description ?? "");
  const [priority, setPriority] = useState<KanbanPriority | "">(initialTask?.priority ?? "");
  const [domain, setDomain] = useState<KanbanDomain | "">(initialTask?.entityType ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialTask?.assignee?.map((a) => a.id) ?? []
  );
  const [dueDate, setDueDate] = useState(initialTask?.dueDate ?? "");
  const [links, setLinks] = useState<string[]>(
    initialTask?.links?.length ? [...initialTask.links] : []
  );
  const [showDescription, setShowDescription] = useState(!!initialTask?.description);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const assigneeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description);
      setPriority(initialTask.priority);
      setDomain(initialTask.entityType);
      setSelectedIds(initialTask.assignee.map((a) => a.id));
      setDueDate(initialTask.dueDate);
      setLinks(initialTask.links?.length ? [...initialTask.links] : []);
      setShowDescription(!!initialTask.description);
    }
  }, [initialTask]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAssigneeDropdown(false);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!showAssigneeDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(target) &&
        !target.closest("[data-assignee-trigger]")
      ) {
        setShowAssigneeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAssigneeDropdown]);

  const selectedEmployees = employees.filter((e) =>
    selectedIds.includes(e.id)
  );

  const assigneeSearchLower = assigneeSearch.trim().toLowerCase();
  const filteredEmployees = employees.filter((emp) => {
    if (selectedIds.includes(emp.id)) return false;
    if (!assigneeSearchLower) return true;
    return (
      emp.name.toLowerCase().includes(assigneeSearchLower) ||
      emp.initials.toLowerCase().includes(assigneeSearchLower) ||
      (emp.role && emp.role.toLowerCase().includes(assigneeSearchLower))
    );
  });

  const addAssignee = (id: string) => {
    setSelectedIds((prev) => [...prev, id]);
    setAssigneeSearch("");
    setShowAssigneeDropdown(false);
    if (errors.assignees) setErrors((e) => ({ ...e, assignees: "" }));
  };

  const removeAssignee = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Required";
    if (!priority) next.priority = "Required";
    if (!domain) next.domain = "Required";
    if (selectedIds.length === 0) next.assignees = "Select at least one";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const assignees = employees.filter((e) =>
      selectedIds.includes(e.id)
    );
    const linkList = links.map((u) => u.trim()).filter(Boolean);
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority: priority as KanbanPriority,
      domain: domain as KanbanDomain,
      assignees,
      dueDate: dueDate || "",
      links: linkList,
      status,
    });
    onClose();
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).form?.querySelector<HTMLButtonElement>('[type="button"]')?.focus();
    }
  };

  const priorityOptions: { value: KanbanPriority; label: string }[] = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ];

  const formContent = (
    <div className={contentOnly ? "space-y-4" : "px-5 pb-5 pt-2 space-y-4"}>
        {/* Title – minimal, borderless look */}
        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
          <Type className="h-5 w-5 text-neutral-400 shrink-0" />
          <input
            ref={titleRef}
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((e) => ({ ...e, title: "" }));
            }}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 border-0 bg-transparent p-0 py-1 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
          />
        </div>
        {errors.title && (
          <p className="text-[11px] text-red-500 -mt-2 pl-8">{errors.title}</p>
        )}

        {/* Assignees – searchable, tag-style chips (reference style) */}
        <div className="space-y-2">
          <div
            data-assignee-trigger
            className="flex items-center gap-3 pb-3 border-b border-neutral-100 relative"
          >
            <Users className="h-5 w-5 text-neutral-400 shrink-0" />
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
              {/* Chips (tags) – light grey rounded pill, avatar + name + X */}
              {selectedEmployees.map((emp) => (
                <span
                  key={emp.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100/80 border border-neutral-200/60 pl-1 pr-2 py-0.5 text-[13px] text-neutral-700"
                >
                  <Avatar className="h-5 w-5 shrink-0">
                    {emp.avatar && (
                      <AvatarImage src={emp.avatar} alt={emp.name} />
                    )}
                    <AvatarFallback className="text-[9px] bg-neutral-400 text-white">
                      {emp.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-normal">{emp.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAssignee(emp.id);
                    }}
                    className="hover:bg-neutral-200 rounded-full p-0.5 text-neutral-400 hover:text-neutral-700"
                    aria-label={`Remove ${emp.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {/* Search input – borderless, italic placeholder */}
              <input
                ref={assigneeInputRef}
                type="text"
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                onFocus={() => setShowAssigneeDropdown(true)}
                placeholder="Add assignees"
                className="flex-1 min-w-[120px] border-0 bg-transparent p-0 py-1 text-[14px] text-neutral-900 placeholder:text-neutral-400 placeholder:italic focus:outline-none focus:ring-0"
              />
            </div>
          </div>
          {showAssigneeDropdown && (
            <div ref={assigneeDropdownRef} className="ml-8">
              {filteredEmployees.length > 0 ? (
                <div className="rounded-xl border border-neutral-200/80 bg-white shadow-lg max-h-[200px] overflow-y-auto py-1.5">
                  {filteredEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left text-[13px] text-neutral-800"
                      onClick={() => addAssignee(emp.id)}
                    >
                      <Avatar className="h-6 w-6 shrink-0">
                        {emp.avatar && (
                          <AvatarImage src={emp.avatar} alt={emp.name} />
                        )}
                        <AvatarFallback className="text-[9px] bg-neutral-400 text-white">
                          {emp.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-normal">{emp.name}</span>
                      {emp.role && (
                        <span className="ml-auto text-[11px] text-neutral-400 truncate max-w-[100px]">
                          {emp.role}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : assigneeSearch.trim() ? (
                <p className="text-[12px] text-neutral-500 italic py-2">
                  No matches
                </p>
              ) : null}
            </div>
          )}
          {errors.assignees && (
            <p className="text-[11px] text-red-500 ml-8 -mt-1">{errors.assignees}</p>
          )}
        </div>

        {/* Domain – minimal row (no highlight) */}
        <div className="space-y-1">
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
            <FolderKanban className="h-5 w-5 text-neutral-400 shrink-0" />
            <Select
              value={domain}
              onValueChange={(v) => {
                setDomain(v as KanbanDomain);
                if (errors.domain) setErrors((e) => ({ ...e, domain: "" }));
              }}
            >
              <SelectTrigger className="h-auto min-h-0 border-0 p-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 text-[14px] flex-1 [&>span]:text-neutral-400 data-[placeholder]:text-neutral-400">
                <SelectValue placeholder="Domain / category" />
              </SelectTrigger>
              <SelectContent>
                {KANBAN_DOMAIN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
          </div>
          {errors.domain && (
            <p className="text-[11px] text-red-500 ml-8 -mt-2">{errors.domain}</p>
          )}
        </div>

        {/* Priority – minimal row (no highlight) */}
        <div className="space-y-1">
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
            <Flag className="h-5 w-5 text-neutral-400 shrink-0" />
            <Select
              value={priority}
              onValueChange={(v) => {
                setPriority(v as KanbanPriority);
                if (errors.priority) setErrors((e) => ({ ...e, priority: "" }));
              }}
            >
              <SelectTrigger className="h-auto min-h-0 border-0 p-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 text-[14px] flex-1 [&>span]:text-neutral-400 data-[placeholder]:text-neutral-400">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
          </div>
          {errors.priority && (
            <p className="text-[11px] text-red-500 ml-8 -mt-2">{errors.priority}</p>
          )}
        </div>

        {/* Due date (optional) – minimal row, same layout as Priority/Flag row, no calendar icon */}
        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
          <span className="text-[15px] text-neutral-400 shrink-0 w-[72px]">Due date</span>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="relative h-auto min-h-0 border-0 p-0 bg-transparent shadow-none focus-visible:ring-0 text-[14px] flex-1 text-neutral-700 placeholder:text-neutral-400 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
          />
        </div>

        {/* Link(s) (optional) – show "Add link" first; inputs appear after click */}
        <div className="space-y-2 pb-3 border-b border-neutral-100">
          {links.length === 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 h-9 text-[13px] text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
              onClick={() => setLinks([""])}
            >
              <Link2 className="h-5 w-5 text-neutral-400" />
              Add link
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-neutral-400 shrink-0" />
                <span className="text-[14px] text-neutral-500">Link</span>
              </div>
              <div className="ml-8 space-y-2">
                {links.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={url}
                      onChange={(e) => {
                        const next = [...links];
                        next[i] = e.target.value;
                        setLinks(next);
                      }}
                      className="h-9 border border-neutral-200/80 rounded-lg bg-white text-[13px] placeholder:text-neutral-400 focus-visible:ring-primary-500/20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-full hover:bg-neutral-100 text-neutral-400"
                      onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}
                      aria-label="Remove link"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[12px] text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 -ml-1"
                  onClick={() => setLinks((prev) => [...prev, ""])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add link
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Description (optional) – minimal link/toggle */}
        {!showDescription ? (
          <button
            type="button"
            className="flex items-center gap-3 w-full text-left text-[13px] text-neutral-500 hover:text-neutral-700 py-2"
            onClick={() => setShowDescription(true)}
          >
            <AlignLeft className="h-5 w-5 text-neutral-400 shrink-0" />
            Add description
          </button>
        ) : (
          <div className="flex items-start gap-3 pb-3 border-b border-neutral-100">
            <AlignLeft className="h-5 w-5 text-neutral-400 shrink-0 mt-1" />
            <Textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="flex-1 min-h-0 border-0 rounded-none p-0 bg-transparent shadow-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[14px] resize-none placeholder:text-neutral-400"
            />
          </div>
        )}

        {/* Primary button (reference style – dark, rounded, full width) */}
        <Button
          type="button"
          className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white text-[14px] font-semibold rounded-[14px] mt-1"
          onClick={handleSubmit}
        >
          {initialTask ? "Save" : "Create task"}
        </Button>

        {/* Helper row – subtle grey text, pill keycaps (hide in dialog) */}
        {!contentOnly && (
          <div className="flex items-center justify-between pt-2 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              Next field
              <kbd className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100/80 text-neutral-500 font-mono text-[10px]">
                Tab
              </kbd>
            </span>
            <span className="flex items-center gap-1.5">
              Close the form
              <kbd className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100/80 text-neutral-500 font-mono text-[10px]">
                Esc
              </kbd>
            </span>
          </div>
        )}
      </div>
  );

  if (contentOnly) return formContent;

  return (
    <Card className="w-full border border-neutral-200/60 shadow-md rounded-[20px] overflow-hidden mb-3 bg-white">
      <div className="flex items-center justify-between px-5 py-3">
        <span className="text-[15px] font-semibold text-neutral-900">
          {initialTask ? "Edit task" : "New task"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-neutral-100 text-neutral-500"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-[18px] w-[18px]" />
        </Button>
      </div>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
