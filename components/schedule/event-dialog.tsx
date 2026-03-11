"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Video,
  Users,
  Zap, 
  AlignLeft,
  Calendar as CalendarIcon,
  Lock,
  Bell,
  X,
  Search,
  UserCircle2,
  Stethoscope,
  AlertTriangle,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useClientsStore } from "@/store/useClientsStore";
import { useEmployeesStore } from "@/store/useEmployeesStore";

type CareType = "personal_care" | "companion_care" | "skilled_nursing" | "respite_care" | "live_in" | "other";

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  day: number;
  date: Date;
  // Home-care specific fields
  client_id?: string;
  caregiver_id?: string;
  care_coordinator_id?: string;
  care_type?: CareType;
  status?: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
  // Legacy fields
  participants?: string[];
  isAllDay?: boolean;
  icon?: "gear" | "rocket" | "paper" | "gift" | "link";
  color?: string;
  tasks?: string[];
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onSave?: (event: CalendarEvent) => void;
  onSaveAndNew?: (event: CalendarEvent, newEvent: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
}

export function EventDialog({ open, onOpenChange, event, onSave, onSaveAndNew, onDelete }: EventDialogProps) {
  const [activeTab, setActiveTab] = useState("caregiver");
  const [caregiverSearchQuery, setCaregiverSearchQuery] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(event?.client_id);
  const [selectedCaregiverId, setSelectedCaregiverId] = useState<string | undefined>(event?.caregiver_id);
  const [caregiverCoordinatorId, setCaregiverCoordinatorId] = useState<string | undefined>(event?.care_coordinator_id);
  const [clientCoordinatorId, setClientCoordinatorId] = useState<string | undefined>(event?.care_coordinator_id);
  const [caregiverCareType, setCaregiverCareType] = useState<CareType>(event?.care_type || "personal_care");
  const [clientCareType, setClientCareType] = useState<CareType>(event?.care_type || "personal_care");
  const [showClientResults, setShowClientResults] = useState(false);
  const [showCaregiverResults, setShowCaregiverResults] = useState(false);
  const [showCaregiverCoordinatorResults, setShowCaregiverCoordinatorResults] = useState(false);
  const [showClientCoordinatorResults, setShowClientCoordinatorResults] = useState(false);
  const [coordinatorSearchQuery, setCoordinatorSearchQuery] = useState("");
  const [caregiverDescription, setCaregiverDescription] = useState("");
  const [clientDescription, setClientDescription] = useState("");
  const [editingCaregiverDescription, setEditingCaregiverDescription] = useState(false);
  const [editingClientDescription, setEditingClientDescription] = useState(false);
  const caregiverDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const clientDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const [tasks, setTasks] = useState<string[]>([""]);
  const [selectedColor, setSelectedColor] = useState<string>(event?.color || "bg-blue-200");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  
  // Store hooks — subscribe only to data, not actions (avoids re-renders)
  const clients = useClientsStore((state) => state.clients);
  const employees = useEmployeesStore((state) => state.employees);

  // Light color options for the picker (200–300 shades)
  const colorOptions = [
    { name: "Blue", class: "bg-blue-200" },
    { name: "Purple", class: "bg-purple-200" },
    { name: "Pink", class: "bg-pink-200" },
    { name: "Rose", class: "bg-rose-200" },
    { name: "Orange", class: "bg-orange-200" },
    { name: "Amber", class: "bg-amber-200" },
    { name: "Yellow", class: "bg-yellow-200" },
    { name: "Lime", class: "bg-lime-200" },
    { name: "Green", class: "bg-green-200" },
    { name: "Emerald", class: "bg-emerald-200" },
    { name: "Teal", class: "bg-teal-200" },
    { name: "Cyan", class: "bg-cyan-200" },
    { name: "Sky", class: "bg-sky-200" },
    { name: "Indigo", class: "bg-indigo-200" },
    { name: "Violet", class: "bg-violet-200" },
    { name: "Fuchsia", class: "bg-fuchsia-200" },
  ];

  // Hydrate stores (use getState to avoid subscribing to action refs)
  useEffect(() => {
    useClientsStore.getState().hydrate();
    useEmployeesStore.getState().hydrate();
  }, []);

  // Filter caregivers (not coordinators or admins)
  const caregivers = useMemo(() => 
    employees.filter(e => 
      ['caregiver', 'cna', 'hha', 'lpn', 'rn'].includes(e.role) && 
      e.status === 'active'
    ),
    [employees]
  );

  // Filter coordinators/admins
  const coordinators = useMemo(() =>
    employees.filter(e => 
      ['coordinator', 'admin'].includes(e.role) && 
      e.status === 'active'
    ),
    [employees]
  );

  // Update state when event changes
  useEffect(() => {
    if (event) {
      setSelectedClientId(event.client_id);
      setSelectedCaregiverId(event.caregiver_id);
      const coordId = event.care_coordinator_id;
      setCaregiverCoordinatorId(coordId);
      setClientCoordinatorId(coordId);
      const cType = event.care_type || "personal_care";
      setCaregiverCareType(cType);
      setClientCareType(cType);
      setSelectedColor(event.color || "bg-blue-200");
      setTasks(event.tasks?.length ? event.tasks : [""]);
    }
  }, [event]);

  // Focus description textarea when entering edit mode
  useEffect(() => {
    if (editingCaregiverDescription) {
      caregiverDescriptionRef.current?.focus();
      caregiverDescriptionRef.current?.setSelectionRange(
        caregiverDescription.length,
        caregiverDescription.length
      );
    }
  }, [editingCaregiverDescription]);

  useEffect(() => {
    if (editingClientDescription) {
      clientDescriptionRef.current?.focus();
      clientDescriptionRef.current?.setSelectionRange(
        clientDescription.length,
        clientDescription.length
      );
    }
  }, [editingClientDescription]);

  // Sync coordinator from caregiver to client tab
  useEffect(() => {
    if (caregiverCoordinatorId) {
      setClientCoordinatorId(caregiverCoordinatorId);
    }
  }, [caregiverCoordinatorId]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  // Search filtering
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients.slice(0, 5);
    const query = clientSearchQuery.toLowerCase();
    return clients.filter(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
      p.phone?.includes(query) ||
      p.email?.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [clientSearchQuery, clients]);

  const filteredCaregivers = useMemo(() => {
    if (!caregiverSearchQuery.trim()) return caregivers.slice(0, 5);
    const query = caregiverSearchQuery.toLowerCase();
    return caregivers.filter(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(query) ||
      c.role.toLowerCase().includes(query) ||
      c.phone?.includes(query)
    ).slice(0, 5);
  }, [caregiverSearchQuery, caregivers]);

  const filteredCoordinators = useMemo(() => {
    if (!coordinatorSearchQuery.trim()) return coordinators.slice(0, 10);
    const query = coordinatorSearchQuery.toLowerCase();
    return coordinators.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(query) ||
      c.role.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [coordinators, coordinatorSearchQuery]);

  // Get selected items
  const selectedClient = useMemo(() => 
    clients.find(p => p.id === selectedClientId),
    [clients, selectedClientId]
  );

  const selectedCaregiver = useMemo(() => 
    employees.find(e => e.id === selectedCaregiverId),
    [employees, selectedCaregiverId]
  );

  const selectedCaregiverCoordinator = useMemo(() =>
    employees.find(e => e.id === caregiverCoordinatorId),
    [employees, caregiverCoordinatorId]
  );

  const selectedClientCoordinator = useMemo(() =>
    employees.find(e => e.id === clientCoordinatorId),
    [employees, clientCoordinatorId]
  );

  // Conflict detection
  const hasConflict = useMemo(() => {
    // TODO: Implement conflict detection logic
    // Check if caregiver has overlapping schedule
    return false;
  }, [selectedCaregiverId, event]);

  const hasWarning = useMemo(() => {
    // Warn if client assigned but no caregiver
    return selectedClientId && !selectedCaregiverId;
  }, [selectedClientId, selectedCaregiverId]);

  // Format date and time for display
  const formatDateTime = () => {
    if (!event) return "";
    const date = event.date;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    if (event.isAllDay) {
      return `${month} ${day}, ${year}`;
    }
    
    const startTime = formatTime(event.startTime);
    const endTime = formatTime(event.endTime);

    return `${month} ${day}, ${year} ${startTime} → ${endTime}`;
  };

  // Get display color based on assignment status
  const getEventColor = () => {
    if (selectedClientId && selectedCaregiverId) return "bg-purple-500";
    if (selectedClientId) return "bg-blue-500";
    if (selectedCaregiverId) return "bg-green-500";
    return "bg-gray-400";
  };

  // Get care type display name
  const getCareTypeLabel = (type: CareType) => {
    const labels: Record<CareType, string> = {
      personal_care: "Personal Care",
      companion_care: "Companion Care",
      skilled_nursing: "Skilled Nursing",
      respite_care: "Respite Care",
      live_in: "Live-In Care",
      other: "Other"
    };
    return labels[type];
  };

  const handleSave = () => {
    if (!event || !onSave) return;

    // Build title from client and caregiver
    let title = "";
    if (selectedClient) {
      title = `${selectedClient.firstName} ${selectedClient.lastName}`;
    }
    if (selectedCaregiver) {
      title += title ? ` • ${selectedCaregiver.firstName} ${selectedCaregiver.lastName}` : 
                       `${selectedCaregiver.firstName} ${selectedCaregiver.lastName}`;
    }
    
    // Use caregiver care type as primary, or client care type as fallback
    const finalCareType = caregiverCareType || clientCareType;
    const finalCoordinatorId = caregiverCoordinatorId || clientCoordinatorId;
    
    if (!title) {
      title = getCareTypeLabel(finalCareType);
    }

    const nonEmptyTasks = tasks.map((t) => t.trim()).filter(Boolean);
    onSave({
      ...event,
      title: title.trim() || "Untitled Care Event",
      client_id: selectedClientId,
      caregiver_id: selectedCaregiverId,
      care_coordinator_id: finalCoordinatorId,
      care_type: finalCareType,
      status: "scheduled",
      color: selectedColor,
      tasks: nonEmptyTasks.length > 0 ? nonEmptyTasks : undefined,
    });
    onOpenChange(false);
  };

  // Handle save and create new event for same time slot
  const handleSaveAndNew = () => {
    if (!event || !onSaveAndNew) return;

    // Build title from client and caregiver
    let title = "";
    if (selectedClient) {
      title = `${selectedClient.firstName} ${selectedClient.lastName}`;
    }
    if (selectedCaregiver) {
      title += title ? ` • ${selectedCaregiver.firstName} ${selectedCaregiver.lastName}` : 
                       `${selectedCaregiver.firstName} ${selectedCaregiver.lastName}`;
    }
    
    // Use caregiver care type as primary, or client care type as fallback
    const finalCareType = caregiverCareType || clientCareType;
    const finalCoordinatorId = caregiverCoordinatorId || clientCoordinatorId;
    
    if (!title) {
      title = getCareTypeLabel(finalCareType);
    }

    const nonEmptyTasks = tasks.map((t) => t.trim()).filter(Boolean);
    // Current event to save
    const savedEvent: CalendarEvent = {
      ...event,
      title: title.trim() || "Untitled Care Event",
      client_id: selectedClientId,
      caregiver_id: selectedCaregiverId,
      care_coordinator_id: finalCoordinatorId,
      care_type: finalCareType,
      status: "scheduled",
      color: selectedColor,
      tasks: nonEmptyTasks.length > 0 ? nonEmptyTasks : undefined,
    };

    // Create new event with same time and day
    const newEvent: CalendarEvent = {
      id: `new-${Date.now()}`,
      title: "",
      startTime: event.startTime,
      endTime: event.endTime,
      day: event.day,
      date: event.date,
      participants: [],
      color: "bg-blue-200",
    };

    // Reset form state
    setSelectedClientId(undefined);
    setSelectedCaregiverId(undefined);
    setCaregiverCoordinatorId(undefined);
    setClientCoordinatorId(undefined);
    setCaregiverCareType("personal_care");
    setClientCareType("personal_care");
    setCaregiverDescription("");
    setClientDescription("");
    setTasks([""]);
    setActiveTab("caregiver"); // Reset to first tab
    setSelectedColor("bg-blue-200"); // Reset color to default
    
    // Reset search queries
    setCaregiverSearchQuery("");
    setClientSearchQuery("");
    
    // Reset editing states
    setEditingCaregiverDescription(false);
    setEditingClientDescription(false);

    // Call parent callback with both events
    onSaveAndNew(savedEvent, newEvent);
  };

  // Handle closing dialog - save on close if there are changes
  const handleClose = (open: boolean) => {
    if (!open) {
      // Save automatically if we have either client or caregiver selected
      if (event && onSave && (selectedClientId || selectedCaregiverId)) {
        handleSave();
        return;
      }
    }
    onOpenChange(open);
  };

  // Handle creating new event if no event exists
  if (!event) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPortal>
        {/* Transparent overlay - no dark background */}
        <DialogOverlay className="fixed inset-0 z-50 bg-transparent pointer-events-none" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] bg-white border border-gray-200 rounded-lg shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "p-0 gap-0"
          )}
        >
          <VisuallyHidden.Root>
            <DialogTitle>Schedule event — {formatDateTime()}</DialogTitle>
          </VisuallyHidden.Root>
          {/* Close button */}
          <button
            onClick={() => handleClose(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          {/* Tabs - Home Care Scheduling */}
          <div className="px-6 pt-6 pb-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-9 bg-gray-100 p-1">
                <TabsTrigger value="caregiver" className="text-xs px-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Caregiver</TabsTrigger>
                <TabsTrigger value="client" className="text-xs px-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Client</TabsTrigger>
                <TabsTrigger value="task" className="text-xs px-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Task</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Date and Time Display - Always visible */}
          <div className="px-6 pb-2">
            <div className="text-sm text-gray-600 font-medium">
              {formatDateTime()}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <div className="space-y-3">
              {/* CAREGIVER TAB */}
              {activeTab === "caregiver" && (
                <div className="space-y-3">
                {/* Search for Caregiver */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                  <Input
                    placeholder="Search for caregiver..."
                    value={caregiverSearchQuery}
                    onChange={(e) => {
                      setCaregiverSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        setShowCaregiverResults(true);
                      }
                    }}
                    onFocus={() => setShowCaregiverResults(true)}
                    className="text-sm h-10 pl-9 border-gray-200 focus-visible:ring-1 focus-visible:ring-gray-300"
                    autoFocus
                  />

                  {/* Caregiver Search Results */}
                  {showCaregiverResults && caregiverSearchQuery.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                      {filteredCaregivers.map((caregiver) => (
                        <button
                          key={caregiver.id}
                          onClick={() => {
                            setSelectedCaregiverId(caregiver.id);
                            setCaregiverSearchQuery("");
                            setShowCaregiverResults(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-green-50 flex items-center gap-3 text-sm"
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={caregiver.avatar} alt={`${caregiver.firstName} ${caregiver.lastName}`} />
                            <AvatarFallback className="bg-green-100 text-green-700 text-xs font-medium">
                              {caregiver.firstName?.[0]}{caregiver.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{caregiver.firstName} {caregiver.lastName}</div>
                            <div className="text-xs text-gray-500 capitalize">{caregiver.role.replace('_', ' ')}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Caregiver Display */}
                {selectedCaregiver && (
                  <div className="flex items-center gap-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={selectedCaregiver.avatar} alt={`${selectedCaregiver.firstName} ${selectedCaregiver.lastName}`} />
                      <AvatarFallback className="bg-green-100 text-green-700 text-xs font-medium">
                        {selectedCaregiver.firstName?.[0]}{selectedCaregiver.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {selectedCaregiver.firstName} {selectedCaregiver.lastName}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">{selectedCaregiver.role.replace('_', ' ')}</div>
                    </div>
                    <button
                      onClick={() => setSelectedCaregiverId(undefined)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Care Type Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">Care Type</label>
                  <select
                    value={caregiverCareType}
                    onChange={(e) => setCaregiverCareType(e.target.value as CareType)}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                  >
                    <option value="personal_care">Personal Care</option>
                    <option value="companion_care">Companion Care</option>
                    <option value="skilled_nursing">Skilled Nursing</option>
                    <option value="respite_care">Respite Care</option>
                    <option value="live_in">Live-In Care</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Add Care Coordinator - inline search */}
                {selectedCaregiverCoordinator ? (
                  <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={selectedCaregiverCoordinator.avatar} alt={`${selectedCaregiverCoordinator.firstName} ${selectedCaregiverCoordinator.lastName}`} />
                      <AvatarFallback className="bg-neutral-200 text-neutral-700 text-xs font-medium">
                        {selectedCaregiverCoordinator.firstName?.[0]}{selectedCaregiverCoordinator.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {selectedCaregiverCoordinator.firstName} {selectedCaregiverCoordinator.lastName}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">{selectedCaregiverCoordinator.role}</div>
                    </div>
                    <button
                      onClick={() => setCaregiverCoordinatorId(undefined)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                    <Input
                      placeholder="Add Care Coordinator"
                      value={coordinatorSearchQuery}
                      onChange={(e) => {
                        setCoordinatorSearchQuery(e.target.value);
                        if (e.target.value.trim()) setShowCaregiverCoordinatorResults(true);
                      }}
                      onFocus={() => setShowCaregiverCoordinatorResults(true)}
                      className="text-sm h-10 pl-9 border-gray-200 focus-visible:ring-1 focus-visible:ring-gray-300"
                    />
                    {showCaregiverCoordinatorResults && filteredCoordinators.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                        {filteredCoordinators.map((coordinator) => (
                          <button
                            key={coordinator.id}
                            onClick={() => {
                              setCaregiverCoordinatorId(coordinator.id);
                              setShowCaregiverCoordinatorResults(false);
                              setCoordinatorSearchQuery("");
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-green-50 flex items-center gap-3 text-sm"
                          >
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={coordinator.avatar} alt={`${coordinator.firstName} ${coordinator.lastName}`} />
                              <AvatarFallback className="bg-neutral-200 text-neutral-700 text-xs font-medium">
                                {coordinator.firstName?.[0]}{coordinator.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900">{coordinator.firstName} {coordinator.lastName}</div>
                              <div className="text-xs text-gray-500 capitalize">{coordinator.role}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Add Description - Inline edit per nessa-form-design */}
                <div className="flex items-center gap-3 w-full text-left text-[13px] py-2 border-b border-neutral-100 pb-3">
                  <AlignLeft className="h-5 w-5 text-neutral-400 shrink-0" />
                  {editingCaregiverDescription ? (
                    <textarea
                      ref={caregiverDescriptionRef}
                      value={caregiverDescription}
                      onChange={(e) => setCaregiverDescription(e.target.value)}
                      onBlur={() => setEditingCaregiverDescription(false)}
                      placeholder="Add description"
                      className="flex-1 min-h-0 border-0 rounded-none p-0 py-1 bg-transparent shadow-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[14px] text-neutral-900 resize-none placeholder:text-neutral-400 min-w-0"
                      rows={2}
                    />
                  ) : (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditingCaregiverDescription(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setEditingCaregiverDescription(true);
                        }
                      }}
                      className="flex-1 truncate text-neutral-500 hover:text-neutral-700 cursor-text"
                    >
                      {caregiverDescription || "Add description"}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* CLIENT TAB */}
            {activeTab === "client" && (
              <div className="space-y-3">
                {/* Search for Client */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                  <Input
                    placeholder="Search for client..."
                    value={clientSearchQuery}
                    onChange={(e) => {
                      setClientSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        setShowClientResults(true);
                      }
                    }}
                    onFocus={() => setShowClientResults(true)}
                    className="text-sm h-10 pl-9 border-gray-200 focus-visible:ring-1 focus-visible:ring-gray-300"
                  />

                  {/* Client Search Results */}
                  {showClientResults && clientSearchQuery.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setClientSearchQuery("");
                            setShowClientResults(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-3 text-sm"
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={c.avatar} alt={`${c.firstName} ${c.lastName}`} />
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                              {c.firstName?.[0]}{c.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{c.firstName} {c.lastName}</div>
                            <div className="text-xs text-gray-500 truncate">{c.phone}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Client Display */}
                {selectedClient && (
                  <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={selectedClient.avatar} alt={`${selectedClient.firstName} ${selectedClient.lastName}`} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                        {selectedClient.firstName?.[0]}{selectedClient.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {selectedClient.firstName} {selectedClient.lastName}
                      </div>
                      <div className="text-xs text-gray-500">Client</div>
                    </div>
                    <button
                      onClick={() => setSelectedClientId(undefined)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Care Type Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">Care Type</label>
                  <select
                    value={clientCareType}
                    onChange={(e) => setClientCareType(e.target.value as CareType)}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                  >
                    <option value="personal_care">Personal Care</option>
                    <option value="companion_care">Companion Care</option>
                    <option value="skilled_nursing">Skilled Nursing</option>
                    <option value="respite_care">Respite Care</option>
                    <option value="live_in">Live-In Care</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Add Care Coordinator - inline search, synced from Caregiver tab */}
                {selectedClientCoordinator ? (
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 border rounded-lg",
                    caregiverCoordinatorId ? "bg-gray-50 border-gray-200 opacity-75" : "bg-gray-50 border-gray-200"
                  )}>
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={selectedClientCoordinator.avatar} alt={`${selectedClientCoordinator.firstName} ${selectedClientCoordinator.lastName}`} />
                      <AvatarFallback className="bg-neutral-200 text-neutral-700 text-xs font-medium">
                        {selectedClientCoordinator.firstName?.[0]}{selectedClientCoordinator.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {selectedClientCoordinator.firstName} {selectedClientCoordinator.lastName}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {selectedClientCoordinator.role}
                        {caregiverCoordinatorId && <span className="ml-1 text-neutral-400">(Set in Caregiver)</span>}
                      </div>
                    </div>
                    {!caregiverCoordinatorId && (
                      <button
                        onClick={() => setClientCoordinatorId(undefined)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                    <Input
                      placeholder="Add Care Coordinator"
                      value={coordinatorSearchQuery}
                      onChange={(e) => {
                        setCoordinatorSearchQuery(e.target.value);
                        if (e.target.value.trim()) setShowClientCoordinatorResults(true);
                      }}
                      onFocus={() => setShowClientCoordinatorResults(true)}
                      className="text-sm h-10 pl-9 border-gray-200 focus-visible:ring-1 focus-visible:ring-gray-300"
                    />
                    {showClientCoordinatorResults && filteredCoordinators.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                        {filteredCoordinators.map((coordinator) => (
                          <button
                            key={coordinator.id}
                            onClick={() => {
                              setClientCoordinatorId(coordinator.id);
                              setShowClientCoordinatorResults(false);
                              setCoordinatorSearchQuery("");
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-green-50 flex items-center gap-3 text-sm"
                          >
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={coordinator.avatar} alt={`${coordinator.firstName} ${coordinator.lastName}`} />
                              <AvatarFallback className="bg-neutral-200 text-neutral-700 text-xs font-medium">
                                {coordinator.firstName?.[0]}{coordinator.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900">{coordinator.firstName} {coordinator.lastName}</div>
                              <div className="text-xs text-gray-500 capitalize">{coordinator.role}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Add Description - Inline edit per nessa-form-design */}
                <div className="flex items-center gap-3 w-full text-left text-[13px] py-2 border-b border-neutral-100 pb-3">
                  <AlignLeft className="h-5 w-5 text-neutral-400 shrink-0" />
                  {editingClientDescription ? (
                    <textarea
                      ref={clientDescriptionRef}
                      value={clientDescription}
                      onChange={(e) => setClientDescription(e.target.value)}
                      onBlur={() => setEditingClientDescription(false)}
                      placeholder="Add description"
                      className="flex-1 min-h-0 border-0 rounded-none p-0 py-1 bg-transparent shadow-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[14px] text-neutral-900 resize-none placeholder:text-neutral-400 min-w-0"
                      rows={2}
                    />
                  ) : (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditingClientDescription(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setEditingClientDescription(true);
                        }
                      }}
                      className="flex-1 truncate text-neutral-500 hover:text-neutral-700 cursor-text"
                    >
                      {clientDescription || "Add description"}
                    </span>
                  )}
                </div>
              </div>
            )}

              {/* TASK TAB */}
              {activeTab === "task" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700">Tasks</label>
                    {tasks.map((task, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-sm text-gray-500 mt-2">•</span>
                        <Input
                          placeholder="Add task..."
                          value={task}
                          onChange={(e) => {
                            const newTasks = [...tasks];
                            newTasks[index] = e.target.value;
                            setTasks(newTasks);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && index === tasks.length - 1 && task.trim()) {
                              setTasks([...tasks, ""]);
                            }
                          }}
                          className="text-sm h-9 border-gray-200 focus-visible:ring-1 focus-visible:ring-gray-300"
                        />
                        {tasks.length > 1 && (
                          <button
                            onClick={() => {
                              const newTasks = tasks.filter((_, i) => i !== index);
                              setTasks(newTasks.length === 0 ? [""] : newTasks);
                            }}
                            className="text-gray-400 hover:text-gray-600 mt-1.5"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => setTasks([...tasks, ""])}
                      className="w-full text-sm h-8 border-gray-200 hover:bg-gray-50"
                    >
                      Add Task
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls - Always visible */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-200">
              {/* Left side: New + Delete */}
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={handleSaveAndNew}
                  variant="outline"
                  className="h-7 px-3 text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
                  disabled={!selectedClientId && !selectedCaregiverId}
                >
                  New
                </Button>
                {event && !event.id.startsWith("new-") && onDelete && (
                  <Button
                    onClick={() => {
                      onDelete(event.id);
                      onOpenChange(false);
                    }}
                    variant="outline"
                    className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              
              {/* Color Picker and Save Button - Right side */}
              <div className="flex items-center gap-2">
                {/* Color Picker Button */}
                <div className="relative" ref={colorPickerRef}>
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="h-7 w-7 rounded border border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center"
                    type="button"
                  >
                    <div className={cn("h-4 w-4 rounded", selectedColor)} />
                  </button>
                  
                  {/* Color Picker Dropdown */}
                  {showColorPicker && (
                    <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50">
                      <div className="grid grid-cols-4 gap-1.5">
                        {colorOptions.map((color) => (
                          <button
                            key={color.class}
                            onClick={() => {
                              setSelectedColor(color.class);
                              setShowColorPicker(false);
                            }}
                            className={cn(
                              "h-7 w-7 rounded hover:scale-110 transition-transform",
                              color.class,
                              selectedColor === color.class && "ring-2 ring-offset-2 ring-gray-400"
                            )}
                            title={color.name}
                            type="button"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!selectedClientId && !selectedCaregiverId}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
