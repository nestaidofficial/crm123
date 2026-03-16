"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
}

interface ServiceMultiSelectProps {
  value?: string[];
  onChange?: (serviceIds: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ServiceMultiSelect({
  value = [],
  onChange,
  placeholder = "Select services...",
  className,
  disabled = false,
}: ServiceMultiSelectProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Fetch services on mount
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch("/api/services");
        if (response.ok) {
          const data = await response.json();
          setServices(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const selectedServices = services.filter(service => value.includes(service.id));

  const handleServiceToggle = (serviceId: string) => {
    if (disabled) return;
    
    const newValue = value.includes(serviceId)
      ? value.filter(id => id !== serviceId)
      : [...value, serviceId];
    
    onChange?.(newValue);
  };

  const handleRemoveService = (serviceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (disabled) return;
    
    const newValue = value.filter(id => id !== serviceId);
    onChange?.(newValue);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
        <div className="h-5 w-5 animate-pulse bg-neutral-200 rounded shrink-0" />
        <div className="flex-1 h-4 bg-neutral-200 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 pb-3 border-b border-neutral-100", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between h-auto min-h-0 border-0 p-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 text-[14px] hover:bg-transparent"
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
              {selectedServices.length > 0 ? (
                selectedServices.map(service => (
                  <Badge
                    key={service.id}
                    variant="secondary"
                    className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100/80 border border-neutral-200/60 pl-2 pr-1 py-0.5 text-[13px] text-neutral-700"
                  >
                    {service.name}
                    <button
                      onClick={(e) => handleRemoveService(service.id, e)}
                      className="hover:bg-neutral-200 rounded-full p-0.5 text-neutral-400 hover:text-neutral-700"
                      disabled={disabled}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-neutral-400">{placeholder}</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="rounded-xl border border-neutral-200/80 bg-white shadow-lg max-h-[200px] overflow-y-auto py-1.5 w-full"
          align="start"
        >
          {services.length === 0 ? (
            <div className="text-[12px] text-neutral-500 italic py-2 px-3">
              No services available
            </div>
          ) : (
            services.map(service => (
              <button
                key={service.id}
                onClick={() => handleServiceToggle(service.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-left text-[13px] text-neutral-800"
                disabled={disabled}
              >
                <div className={cn(
                  "h-4 w-4 border border-neutral-300 rounded flex items-center justify-center",
                  value.includes(service.id) && "bg-neutral-900 border-neutral-900"
                )}>
                  {value.includes(service.id) && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
                <span className="flex-1">{service.name}</span>
              </button>
            ))
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}