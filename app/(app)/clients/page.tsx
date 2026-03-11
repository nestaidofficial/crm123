"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Filter } from "lucide-react";
import { useClientsStore } from "@/store/useClientsStore";

const ClientCreateWizard = dynamic(
  () => import("@/components/clients/ClientCreateWizard").then(m => ({ default: m.ClientCreateWizard })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
      </div>
    )
  }
);

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function ClientsPage() {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const clients = useClientsStore((state) => state.clients);
  const hydrated = useClientsStore((state) => state.hydrated);

  const filteredClients = useMemo(() => {
    if (!query.trim()) return clients ?? [];
    const q = query.toLowerCase();
    return (clients ?? []).filter((p) => {
      const name = `${p.firstName} ${p.lastName}`.toLowerCase();
      const email = (p.email ?? "").toLowerCase();
      const phone = p.phone.toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        p.address.city.toLowerCase().includes(q) ||
        p.address.state.toLowerCase().includes(q)
      );
    });
  }, [clients, query]);

  const handleRowClick = (clientId: string) => {
    router.push(`/clients/${clientId}`);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header — matches Task page style */}
        <div className="flex items-center justify-between border-b border-neutral-200 pb-0 pt-4">
          {/* Left: title */}
          <div className="py-2">
            <h1 className="text-[20px] font-semibold text-neutral-900 leading-none">Clients</h1>
          </div>

          {/* Right: search + filters + add */}
          <div className="flex items-center gap-2 py-2 mr-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
              <Input
                type="search"
                placeholder="Search clients…"
                className="pl-8 pr-3 h-7 w-[200px] bg-white border-neutral-200 text-[12px] placeholder:text-neutral-400 focus-visible:ring-0"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="h-7 px-3 text-[12px] font-medium border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 gap-1.5"
            >
              <Filter className="h-3.5 w-3.5 text-neutral-400" />
              Filters
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="h-9 rounded-full bg-[#FED96A] hover:bg-[#e8c55a] text-neutral-900 text-[13px] px-4"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="font-semibold">Add Client</span>
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-4">
            {!hydrated ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">Loading clients…</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-sm text-muted-foreground">
                  {(clients ?? []).length === 0
                    ? "No clients yet. Add your first client to get started."
                    : "No clients match your search."}
                </p>
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="py-2 pr-3 text-left">
                        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">Status</span>
                      </th>
                      <th className="py-2 px-3 text-left">
                        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">Client</span>
                      </th>
                      <th className="py-2 px-3 text-left">
                        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">Primary Contact</span>
                      </th>
                      <th className="py-2 px-3 text-left">
                        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">Date Added</span>
                      </th>
                      <th className="py-2 px-3 text-left">
                        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">Phone</span>
                      </th>
                      <th className="py-2 px-3 text-left">
                        <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">Location</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {filteredClients.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => handleRowClick(p.id)}
                        className="hover:bg-neutral-25 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-neutral-500" />
                            <span className="text-[13px] font-medium text-neutral-900">
                              {p.careType === "medical" ? "Medical" : "Non-medical"}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {p.avatar && (
                                <AvatarImage src={p.avatar} alt={`${p.firstName} ${p.lastName}`} />
                              )}
                              <AvatarFallback className="bg-neutral-100 text-neutral-700 text-[13px] font-semibold">
                                {getInitials(p.firstName, p.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-[14px] font-medium text-neutral-900">
                                {p.firstName} {p.lastName}
                              </div>
                              <div className="text-[12px] text-neutral-500">
                                DOB {p.dob}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div>
                            <div className="text-[13px] font-medium text-neutral-900">
                              {p.primaryContact.name}
                            </div>
                            <div className="text-[12px] text-neutral-500">
                              {p.primaryContact.relation}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-[13px] text-neutral-900">{p.dob}</div>
                          <div className="text-[12px] text-neutral-500">
                            {new Date(p.dob).toLocaleDateString("en-US", { 
                              month: "short", 
                              day: "numeric", 
                              year: "numeric" 
                            })}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-[13px] text-neutral-900">{p.phone}</div>
                          {p.email && (
                            <div className="text-[12px] text-neutral-500">{p.email}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-[13px] text-neutral-900">
                            {p.address.city}, {p.address.state}
                          </div>
                          <div className="text-[12px] text-neutral-500">{p.address.zip}</div>
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

      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto p-0">
          <div className="p-6">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-h1 text-neutral-900">Add Client</SheetTitle>
              <SheetDescription className="text-body-m text-neutral-500">
                Complete the steps below to add a new client.
              </SheetDescription>
            </SheetHeader>
            <ClientCreateWizard onComplete={() => setIsCreateOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
