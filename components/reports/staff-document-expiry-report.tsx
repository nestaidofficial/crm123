"use client";

import { useEffect, useState, useCallback, useId, useMemo } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Cell,
  type ColumnDef,
  type ColumnFiltersState,
  type Header,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ColumnsIcon,
  Copy,
  Download,
  Eye,
  GripVertical,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type DocReportRow = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
  docId: string;
  docName: string;
  docType: string;
  expiryDate?: string;
  uploadedAt: string;
  url?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  caregiver: "Caregiver", cna: "CNA", hha: "HHA",
  lpn: "LPN", rn: "RN", admin: "Admin",
  coordinator: "Coordinator", other: "Other",
};
const DOC_TYPE_LABELS: Record<string, string> = {
  id: "ID", contract: "Contract", certification: "Certification",
  training: "Training", reference: "Reference", other: "Other",
  application: "Application", cori: "CORI", sori: "SORI",
  i9: "I-9", policy: "Policy", emergency: "Emergency",
  w4: "W-4", direct_deposit: "Direct Deposit", offer_letter: "Offer Letter",
  interview: "Interview", transportation: "Transportation",
};

function getInitials(f: string, l: string) {
  return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
}

function calcDaysLeft(expiryDate?: string): number | null {
  if (!expiryDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate); exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DaysLeftBadge({ daysLeft }: { daysLeft: number | null }) {
  if (daysLeft === null) return <Badge variant="neutral" className="h-5 text-[11px] px-2">No expiry</Badge>;
  if (daysLeft < 0)  return <Badge variant="negative" className="h-5 text-[11px] px-2">Expired {Math.abs(daysLeft)}d ago</Badge>;
  if (daysLeft <= 7)  return <Badge variant="negative" className="h-5 text-[11px] px-2">{daysLeft}d left</Badge>;
  if (daysLeft <= 30) return <Badge variant="warning"  className="h-5 text-[11px] px-2">{daysLeft}d left</Badge>;
  return <Badge variant="positive" className="h-5 text-[11px] px-2">{daysLeft}d left</Badge>;
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Column definitions ───────────────────────────────────────────────────────
function buildColumns(
  onView: (url?: string) => void,
  onDownload: (url?: string, name?: string) => void,
  onUpload: (empId: string) => void,
): ColumnDef<DocReportRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 44,
    },
    {
      id: "staff",
      accessorFn: (r) => `${r.firstName} ${r.lastName}`,
      header: "Staff",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-[10px] bg-neutral-200 text-neutral-700">
              {getInitials(row.original.firstName, row.original.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate">
              {row.original.firstName} {row.original.lastName}
            </p>
            <p className="text-xs text-neutral-500">{ROLE_LABELS[row.original.role] ?? row.original.role}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "docType",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-sm text-neutral-700">
          {DOC_TYPE_LABELS[row.getValue("docType") as string] ?? row.getValue("docType")}
        </span>
      ),
    },
    {
      accessorKey: "docName",
      header: "Document",
      cell: ({ row }) => (
        <button
          onClick={() => onView(row.original.url)}
          className="text-sm text-blue-600 hover:text-blue-700 hover:underline text-left truncate max-w-[200px]"
        >
          {row.getValue("docName")}
        </button>
      ),
    },
    {
      accessorKey: "expiryDate",
      header: "Expiry Date",
      cell: ({ row }) => (
        <span className="text-sm text-neutral-700 whitespace-nowrap">
          {fmtDate(row.getValue("expiryDate"))}
        </span>
      ),
    },
    {
      id: "daysLeft",
      accessorFn: (r) => calcDaysLeft(r.expiryDate),
      header: "Days Left",
      cell: ({ row }) => <DaysLeftBadge daysLeft={calcDaysLeft(row.original.expiryDate)} />,
      sortingFn: (a, b) => {
        const av = calcDaysLeft(a.original.expiryDate) ?? Infinity;
        const bv = calcDaysLeft(b.original.expiryDate) ?? Infinity;
        return av - bv;
      },
    },
    {
      accessorKey: "uploadedAt",
      header: "Uploaded",
      cell: ({ row }) => (
        <span className="text-sm text-neutral-500 whitespace-nowrap">
          {fmtDate(row.getValue("uploadedAt"))}
        </span>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => <div className="text-end">Actions</div>,
      cell: ({ row }) => (
        <div className="text-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Document actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onView(row.original.url)}>
                <Eye className="h-4 w-4" /> View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload(row.original.url, row.original.docName)}>
                <Download className="h-4 w-4" /> Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUpload(row.original.employeeId)}>
                <Upload className="h-4 w-4" /> Upload new version
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.original.docId)}>
                <Copy className="h-4 w-4" /> Copy document ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}

// ─── Drag-sortable header ─────────────────────────────────────────────────────
function DraggableDocHeader({ header }: { header: Header<DocReportRow, unknown> }) {
  const nonDraggable = header.column.id === "select" || header.column.id === "actions";
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: header.column.id,
    disabled: nonDraggable,
  });
  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: "relative",
    transform: CSS.Translate.toString(transform),
    transition,
    whiteSpace: "nowrap",
    zIndex: isDragging ? 1 : 0,
  };
  if (nonDraggable) {
    return (
      <TableHead className="relative h-10 border-t-0" style={{ width: header.column.getSize() }} colSpan={header.colSpan}>
        <div className={header.column.id === "select" ? "flex items-center" : ""}>
          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      </TableHead>
    );
  }
  return (
    <TableHead ref={setNodeRef} className="relative h-10 border-t-0" style={style} colSpan={header.colSpan}>
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-sm">
          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
        </span>
        <div className="flex items-center shrink-0">
          {header.column.getCanSort() && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={header.column.getToggleSortingHandler()}>
              <ArrowUpDown className="h-3 w-3 opacity-40" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-6 w-6 cursor-grab" {...attributes} {...listeners}>
            <GripVertical className="h-3 w-3 opacity-40" />
          </Button>
        </div>
      </div>
    </TableHead>
  );
}

// ─── Drag-along cell ──────────────────────────────────────────────────────────
function DragAlongDocCell({ cell }: { cell: Cell<DocReportRow, unknown> }) {
  const nonDraggable = cell.column.id === "select" || cell.column.id === "actions";
  const { isDragging, setNodeRef, transform, transition } = useSortable({
    id: cell.column.id,
    disabled: nonDraggable,
  });
  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: "relative",
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };
  if (nonDraggable) {
    return (
      <TableCell className={cell.column.id === "select" ? "w-[44px]" : ""}>
        <div className={cell.column.id === "select" ? "flex items-center" : ""}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      </TableCell>
    );
  }
  return (
    <TableCell ref={setNodeRef} className="truncate" style={style}>
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </TableCell>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function StaffDocumentExpiryReport() {
  const router = useRouter();
  const [data, setData] = useState<DocReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch]             = useState("");
  const [type, setType]                 = useState("all");
  const [expiryStatus, setExpiryStatus] = useState("all");
  const [role, setRole]                 = useState("all");

  // Table state
  const [sorting, setSorting]                 = useState<SortingState>([{ id: "daysLeft", desc: false }]);
  const [columnFilters, setColumnFilters]     = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection]       = useState({});
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    ["staff", "docType", "docName", "expiryDate", "daysLeft", "uploadedAt"]
  );
  const dndId = useId();

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  // Fetch report data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (type !== "all") params.set("type", type);
      if (expiryStatus !== "all") params.set("expiryStatus", expiryStatus);
      if (role !== "all") params.set("role", role);

      const res = await apiFetch(`/api/reports/staff-document-expiry?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error || "Failed to fetch report");
      }
      const json = await res.json();
      const rows = (Array.isArray(json?.data) ? json.data : []).map((r: any): DocReportRow => ({
        id:          `${r.employee.id}-${r.document.id}`,
        employeeId:  r.employee.id,
        firstName:   r.employee.firstName,
        lastName:    r.employee.lastName,
        avatarUrl:   r.employee.avatarUrl,
        role:        r.employee.role,
        docId:       r.document.id,
        docName:     r.document.name,
        docType:     r.document.type,
        expiryDate:  r.document.expiryDate,
        uploadedAt:  r.document.uploadedAt,
        url:         r.document.url,
      }));
      setData(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load report");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [search, type, expiryStatus, role]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Action handlers
  const handleView     = (url?: string) => url ? window.open(url, "_blank") : toast.error("Document URL not available");
  const handleDownload = (url?: string, name?: string) => {
    if (!url) { toast.error("Document URL not available"); return; }
    const a = document.createElement("a");
    a.href = url; a.download = name || "document"; a.click();
  };
  const handleUpload = (empId: string) => {
    router.push(`/hr/employees/${empId}#documents`);
    toast.info("Navigate to employee's Documents tab to upload");
  };

  // Columns
  const baseColumns = useMemo(
    () => buildColumns(handleView, handleDownload, handleUpload),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const fullColumnOrder = useMemo(() => ["select", ...columnOrder, "actions"], [columnOrder]);

  const columns = useMemo<ColumnDef<DocReportRow>[]>(() => {
    const select  = baseColumns.find((c) => c.id === "select")!;
    const actions = baseColumns.find((c) => c.id === "actions")!;
    const ordered = columnOrder
      .map((id) => baseColumns.find((c) => c.id === id || ("accessorKey" in c && c.accessorKey === id)))
      .filter((c): c is ColumnDef<DocReportRow> => !!c);
    return [select, ...ordered, actions];
  }, [columnOrder, baseColumns]);

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    columnResizeMode: "onChange",
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: (updater) => {
      const next = typeof updater === "function" ? updater(fullColumnOrder) : updater;
      setColumnOrder(next.filter((id: string) => id !== "select" && id !== "actions"));
    },
    state: { sorting, columnFilters, columnVisibility, rowSelection, columnOrder: fullColumnOrder },
    initialState: { pagination: { pageSize: 10 } },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (
      active && over && active.id !== over.id &&
      active.id !== "select" && active.id !== "actions" &&
      over.id !== "select" && over.id !== "actions"
    ) {
      setColumnOrder((order) => {
        const oldIdx = order.indexOf(active.id as string);
        const newIdx = order.indexOf(over.id as string);
        return arrayMove(order, oldIdx, newIdx);
      });
    }
  }

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="space-y-4">
      {/* Table card — unified toolbar + filters */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-card overflow-hidden">
        {/* Toolbar with inline filters */}
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-3">
          {/* Doc count */}
          <p className="text-[13px] font-medium text-neutral-900 shrink-0">
            {loading ? "Loading…" : `${table.getFilteredRowModel().rows.length} document${table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}`}
          </p>

          {/* Divider */}
          <div className="h-5 w-px bg-neutral-200 shrink-0" />

          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff…"
              className="pl-8 h-9 text-sm w-56"
            />
          </div>

          {/* Type */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 text-sm font-normal">
                {type === "all" ? "All types" : DOC_TYPE_LABELS[type] ?? type}
                <ChevronDown aria-hidden="true" className="-me-1 opacity-60" size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                {[
                  { value: "all",          label: "All types" },
                  { value: "id",           label: "ID" },
                  { value: "contract",     label: "Contract" },
                  { value: "certification",label: "Certification" },
                  { value: "training",     label: "Training" },
                  { value: "reference",    label: "Reference" },
                  { value: "other",        label: "Other" },
                ].map((opt) => (
                  <DropdownMenuItem key={opt.value} onSelect={() => setType(opt.value)} className="flex items-center justify-between">
                    {opt.label}
                    {type === opt.value && <Check aria-hidden="true" size={14} className="opacity-60 ml-2" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Expiry */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 text-sm font-normal">
                {expiryStatus === "all" ? "All expiry" :
                 expiryStatus === "overdue" ? "Overdue" :
                 `Within ${expiryStatus} days`}
                <ChevronDown aria-hidden="true" className="-me-1 opacity-60" size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                {[
                  { value: "all",     label: "All expiry" },
                  { value: "overdue", label: "Overdue" },
                  { value: "7",       label: "Within 7 days" },
                  { value: "30",      label: "Within 30 days" },
                  { value: "60",      label: "Within 60 days" },
                ].map((opt) => (
                  <DropdownMenuItem key={opt.value} onSelect={() => setExpiryStatus(opt.value)} className="flex items-center justify-between">
                    {opt.label}
                    {expiryStatus === opt.value && <Check aria-hidden="true" size={14} className="opacity-60 ml-2" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Role */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 text-sm font-normal">
                {role === "all" ? "All roles" : (ROLE_LABELS[role] ?? role)}
                <ChevronDown aria-hidden="true" className="-me-1 opacity-60" size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                {[
                  { value: "all",         label: "All roles" },
                  { value: "caregiver",   label: "Caregiver" },
                  { value: "cna",         label: "CNA" },
                  { value: "hha",         label: "HHA" },
                  { value: "lpn",         label: "LPN" },
                  { value: "rn",          label: "RN" },
                  { value: "admin",       label: "Admin" },
                  { value: "coordinator", label: "Coordinator" },
                ].map((opt) => (
                  <DropdownMenuItem key={opt.value} onSelect={() => setRole(opt.value)} className="flex items-center justify-between">
                    {opt.label}
                    {role === opt.value && <Check aria-hidden="true" size={14} className="opacity-60 ml-2" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right-side actions */}
          <div className="flex items-center gap-2 ml-auto">
            {selectedCount > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    Actions <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{selectedCount} selected</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Download className="h-4 w-4" /> Download selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-400 hover:text-neutral-700" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <ColumnsIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table.getAllColumns().filter((c) => c.getCanHide()).map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="capitalize"
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  >
                    {col.id.replace(/([A-Z])/g, " $1").trim()}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Table */}
        <div className="border-t border-neutral-200/60">
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="bg-neutral-50/80 hover:bg-neutral-50/80 [&>th]:border-t-0">
                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                      {hg.headers.map((header) => (
                        <DraggableDocHeader key={header.id} header={header} />
                      ))}
                    </SortableContext>
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-neutral-400 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-neutral-50/60">
                      <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                        {row.getVisibleCells().map((cell) => (
                          <DragAlongDocCell key={cell.id} cell={cell} />
                        ))}
                      </SortableContext>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-neutral-400 text-sm">
                      No documents match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-200/60 px-5 py-3">
          <p className="text-neutral-500 text-sm">
            {selectedCount > 0
              ? `${selectedCount} of ${table.getFilteredRowModel().rows.length} selected`
              : `${table.getFilteredRowModel().rows.length} document${table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
