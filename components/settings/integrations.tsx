"use client";

import { useState } from "react";
import { XIcon, PlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConnectedIntegration {
  id: string;
  name: string;
  iconUrl: string;
}

const initialIntegrations: ConnectedIntegration[] = [
  {
    id: "ehr",
    name: "EHR System",
    iconUrl: "",
  },
];

const Integrations = () => {
  const [connectedIntegrations, setConnectedIntegrations] =
    useState<ConnectedIntegration[]>(initialIntegrations);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [appName, setAppName] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [appIconUrl, setAppIconUrl] = useState("");
  const [description, setDescription] = useState("");

  const handleRemoveIntegration = (integrationId: string) => {
    setConnectedIntegrations((prev) =>
      prev.filter((integration) => integration.id !== integrationId)
    );
  };

  const resetForm = () => {
    setAppName("");
    setAppUrl("");
    setAppIconUrl("");
    setDescription("");
  };

  const handleConnect = () => {
    if (!appName.trim() || !appUrl.trim()) return;

    const id = appName.toLowerCase().replace(/\s+/g, "-");

    setConnectedIntegrations((prev) => [
      ...prev,
      {
        id,
        name: appName,
        iconUrl: appIconUrl.trim() || "",
      },
    ]);

    resetForm();
    setIsDialogOpen(false);
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col">
        <h3 className="text-foreground font-semibold">Connect Integrations</h3>
        <p className="text-muted-foreground text-sm">
          Connect with EHR, payment, and other third-party systems.
        </p>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-center gap-4">
          {connectedIntegrations.map((integration) => (
            <div
              key={integration.id}
              className="flex w-fit items-center gap-3 rounded-md border p-2"
            >
              {integration.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={integration.iconUrl}
                  alt={integration.name}
                  className="size-4 rounded"
                />
              ) : (
                <div className="bg-muted-foreground/10 text-muted-foreground flex size-4 items-center justify-center rounded text-sm font-medium">
                  {integration.name.charAt(0)}
                </div>
              )}

              <p className="text-sm font-medium">{integration.name}</p>
              <Button
                size="sm"
                variant="ghost"
                className="text-primary bg-primary/10 rounded-md transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
                aria-label={`Remove ${integration.name}`}
                onClick={() => handleRemoveIntegration(integration.id)}
              >
                <XIcon className="size-3" aria-hidden="true" />
              </Button>
            </div>
          ))}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-10.5"
                onClick={() => setIsDialogOpen(true)}
              >
                <PlusIcon className="size-4" />
                Add Integration
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect New Integration</DialogTitle>
                <DialogDescription>
                  Add a new integration by providing the details below.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 py-2">
                <div className="grid gap-1">
                  <Label>Integration Name</Label>
                  <Input
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="e.g., QuickBooks"
                  />
                </div>

                <div className="grid gap-1">
                  <Label>API URL or Integration Key</Label>
                  <Input
                    value={appUrl}
                    onChange={(e) => setAppUrl(e.target.value)}
                    placeholder="https://api.example.com or key_abc123"
                  />
                </div>

                <div className="grid gap-1">
                  <Label>Optional Description</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Notes about this integration (optional)"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={!appName.trim() || !appUrl.trim()}
                >
                  Connect
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-muted-foreground text-sm">
          Connected integrations allow you to sync data with third-party services
          for enhanced functionality.
        </p>
      </div>
    </div>
  );
};

export default Integrations;
