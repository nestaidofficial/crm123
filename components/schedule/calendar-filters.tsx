"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export function CalendarFilters() {
  const [filters, setFilters] = useState({
    newClient: false,
    incompleteDocuments: false,
    unpaidBalances: false,
    insuranceTypes: [] as string[],
    clinicians: [] as string[],
    locations: [] as string[],
  });

  const activeFiltersCount = 
    (filters.newClient ? 1 : 0) +
    (filters.incompleteDocuments ? 1 : 0) +
    (filters.unpaidBalances ? 1 : 0) +
    filters.insuranceTypes.length +
    filters.clinicians.length +
    filters.locations.length;

  return (
    <Card className="mt-4">
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Quick Filters */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Quick Filters</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="new-client"
                  checked={filters.newClient}
                  onCheckedChange={(checked) => 
                    setFilters({ ...filters, newClient: checked as boolean })
                  }
                />
                <Label htmlFor="new-client" className="font-normal cursor-pointer">
                  New Clients
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="incomplete-docs"
                  checked={filters.incompleteDocuments}
                  onCheckedChange={(checked) => 
                    setFilters({ ...filters, incompleteDocuments: checked as boolean })
                  }
                />
                <Label htmlFor="incomplete-docs" className="font-normal cursor-pointer">
                  Incomplete Documents
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="unpaid"
                  checked={filters.unpaidBalances}
                  onCheckedChange={(checked) => 
                    setFilters({ ...filters, unpaidBalances: checked as boolean })
                  }
                />
                <Label htmlFor="unpaid" className="font-normal cursor-pointer">
                  Unpaid Balances
                </Label>
              </div>
            </div>
          </div>

          {/* Insurance Type */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Insurance Type</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select insurance type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medicare">Medicare</SelectItem>
                <SelectItem value="medicaid">Medicaid</SelectItem>
                <SelectItem value="private">Private Insurance</SelectItem>
                <SelectItem value="self-pay">Self Pay</SelectItem>
              </SelectContent>
            </Select>
            {filters.insuranceTypes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.insuranceTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="flex items-center gap-1">
                    {type}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setFilters({
                        ...filters,
                        insuranceTypes: filters.insuranceTypes.filter(t => t !== type)
                      })}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Clinicians */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Clinicians</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select clinician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clinicians</SelectItem>
                <SelectItem value="john">John Doe</SelectItem>
                <SelectItem value="jane">Jane Smith</SelectItem>
                <SelectItem value="mike">Mike Johnson</SelectItem>
              </SelectContent>
            </Select>
            {filters.clinicians.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.clinicians.map((clinician) => (
                  <Badge key={clinician} variant="secondary" className="flex items-center gap-1">
                    {clinician}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setFilters({
                        ...filters,
                        clinicians: filters.clinicians.filter(c => c !== clinician)
                      })}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Locations */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Locations</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="main">Main Office</SelectItem>
                <SelectItem value="north">North Branch</SelectItem>
                <SelectItem value="south">South Branch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters & Actions */}
        {activeFiltersCount > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {activeFiltersCount} active filter{activeFiltersCount !== 1 ? "s" : ""}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setFilters({
                newClient: false,
                incompleteDocuments: false,
                unpaidBalances: false,
                insuranceTypes: [],
                clinicians: [],
                locations: [],
              })}
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
