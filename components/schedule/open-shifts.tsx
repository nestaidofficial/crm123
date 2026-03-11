"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign,
  Users,
  Filter
} from "lucide-react";
import { ShiftDetailsDialog } from "./shift-details-dialog";

interface OpenShift {
  id: string;
  shiftType: string;
  clientName: string;
  clientAddress: string;
  date: string;
  startTime: string;
  endTime: string;
  payRate: string;
  payType: string;
  instructions: string;
  tasks: string[];
  requiredForms: string[];
  isOpenShift: true;
}

const sampleOpenShifts: OpenShift[] = [
  {
    id: "1",
    shiftType: "Personal Care",
    clientName: "Maren",
    clientAddress: "123 Main St, Boston, MA",
    date: "2026-01-20",
    startTime: "9:00 AM",
    endTime: "1:00 PM",
    payRate: "25.00",
    payType: "hourly",
    instructions: "Assist with morning routine, medication administration, and light meal preparation.",
    tasks: [
      "Assist with bathing and dressing",
      "Administer morning medications",
      "Prepare breakfast",
      "Light housekeeping"
    ],
    requiredForms: ["Care Plan", "Medication Log", "Progress Notes"],
    isOpenShift: true,
  },
  {
    id: "2",
    shiftType: "Companion Care",
    clientName: "Sofia",
    clientAddress: "456 Oak Ave, Cambridge, MA",
    date: "2026-01-21",
    startTime: "2:00 PM",
    endTime: "6:00 PM",
    payRate: "22.00",
    payType: "hourly",
    instructions: "Provide companionship, assist with activities, and accompany to doctor's appointment.",
    tasks: [
      "Engage in conversation and activities",
      "Transport to doctor's appointment",
      "Assist with afternoon routine"
    ],
    requiredForms: ["Care Plan", "Activity Log"],
    isOpenShift: true,
  },
  {
    id: "3",
    shiftType: "Night Shift",
    clientName: "Austin",
    clientAddress: "789 Pine Rd, Somerville, MA",
    date: "2026-01-22",
    startTime: "11:00 PM",
    endTime: "7:00 AM",
    payRate: "28.00",
    payType: "hourly",
    instructions: "Overnight care, monitor safety, assist with nighttime needs.",
    tasks: [
      "Monitor throughout the night",
      "Assist with bathroom needs",
      "Ensure safety and comfort"
    ],
    requiredForms: ["Care Plan", "Vital Signs", "Progress Notes"],
    isOpenShift: true,
  },
];

export function OpenShifts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftTypeFilter, setShiftTypeFilter] = useState("all");
  const [selectedShift, setSelectedShift] = useState<OpenShift | null>(null);

  const filteredShifts = sampleOpenShifts.filter((shift) => {
    const matchesSearch =
      shift.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shift.shiftType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shift.clientAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = shiftTypeFilter === "all" || shift.shiftType === shiftTypeFilter;
    return matchesSearch && matchesType;
  });

  const uniqueShiftTypes = Array.from(new Set(sampleOpenShifts.map((s) => s.shiftType)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Open Shifts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Available shifts that caregivers can self-assign
          </p>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          {filteredShifts.length} Available
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client, shift type, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-[50px]"
          />
        </div>
        <Select value={shiftTypeFilter} onValueChange={setShiftTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shift Types</SelectItem>
            {uniqueShiftTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Shifts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredShifts.map((shift) => (
          <Card
            key={shift.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedShift(shift)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-sm font-semibold">{shift.shiftType}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{shift.clientName}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Open
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>{new Date(shift.date).toLocaleDateString("en-US", { 
                    weekday: "short", 
                    month: "short", 
                    day: "numeric" 
                  })}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>{shift.startTime} - {shift.endTime}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{shift.clientAddress}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span>${shift.payRate}/{shift.payType}</span>
                </div>
              </div>

              {shift.tasks && shift.tasks.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-1 mb-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {shift.tasks.length} task{shift.tasks.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {shift.requiredForms?.slice(0, 2).map((form, idx) => (
                      <Badge key={idx} variant="outline" className="text-[9px]">
                        {form}
                      </Badge>
                    ))}
                    {shift.requiredForms && shift.requiredForms.length > 2 && (
                      <Badge variant="outline" className="text-[9px]">
                        +{shift.requiredForms.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <Button className="w-full mt-2" size="sm">
                View Details & Assign
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredShifts.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No open shifts found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      <ShiftDetailsDialog
        open={!!selectedShift}
        onOpenChange={(open) => !open && setSelectedShift(null)}
        shift={selectedShift}
      />
    </div>
  );
}
