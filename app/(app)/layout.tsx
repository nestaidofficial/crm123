import { AppLayout } from "@/components/layout/AppLayout";
import { StoreHydrator } from "@/components/layout/store-hydrator";
import { AgencyProvider } from "@/lib/agency-context";

// All routes in (app) require authentication — never statically prerender them.
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AgencyProvider>
      <AppLayout>
        <StoreHydrator />
        {children}
      </AppLayout>
    </AgencyProvider>
  );
}
