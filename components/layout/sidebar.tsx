import { SidebarClient } from "./sidebar-client";

export function Sidebar() {
  return (
    <aside className="w-52 shrink-0 min-h-0 border-r border-neutral-200/60 bg-white flex flex-col overflow-hidden">
      <SidebarClient />
    </aside>
  );
}
