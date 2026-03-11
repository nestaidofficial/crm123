import type { TimesheetEntry } from "@/lib/db/evv.mapper";

/**
 * Format a date as YYYY-MM-DD
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toISOString().split("T")[0];
}

/**
 * Format a time as HH:MM AM/PM
 */
function formatTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format address as single line
 */
function formatAddress(address: { street: string; city: string; state: string; zip: string }): string {
  return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data: string[][]): string {
  return data
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if cell contains comma, quote, or newline
          const cellStr = String(cell ?? "");
          if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(",")
    )
    .join("\n");
}

/**
 * Trigger browser download of a file
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export timesheets to CSV format
 */
export function exportTimesheetsToCSV(
  entries: TimesheetEntry[],
  options?: {
    filename?: string;
    includePayDetails?: boolean;
  }
): void {
  const filename = options?.filename ?? `timesheets_${new Date().toISOString().split("T")[0]}.csv`;
  const includePayDetails = options?.includePayDetails ?? true;

  // Build CSV headers
  const headers = [
    "Shift Date",
    "Caregiver",
    "Client",
    "Address",
    "Clock In",
    "Clock Out",
    "Break (min)",
    "Billable Hours",
  ];

  if (includePayDetails) {
    headers.push("Pay Rate", "Pay Type", "Pay Amount", "Payment Status");
  }

  headers.push("Service Type", "Funding Source");

  // Build CSV rows
  const rows = entries.map((entry) => {
    const row = [
      formatDate(entry.shiftDate),
      entry.caregiver.name,
      entry.client.name,
      formatAddress(entry.client.address),
      formatTime(entry.clockIn),
      formatTime(entry.clockOut),
      entry.breakMinutes.toString(),
      entry.billableHours.toFixed(2),
    ];

    if (includePayDetails) {
      const payRateDisplay =
        entry.caregiver.payType === "salary"
          ? `${formatCurrency(entry.caregiver.payRate)}/yr`
          : entry.caregiver.payType === "per-visit"
          ? `${formatCurrency(entry.caregiver.payRate)}/visit`
          : `${formatCurrency(entry.caregiver.payRate)}/hr`;

      row.push(
        payRateDisplay,
        entry.caregiver.payType,
        formatCurrency(entry.payAmount),
        entry.paymentStatus.charAt(0).toUpperCase() + entry.paymentStatus.slice(1)
      );
    }

    row.push(entry.serviceType, entry.fundingSource);

    return row;
  });

  // Combine headers and rows
  const csvData = [headers, ...rows];
  const csvContent = arrayToCSV(csvData);

  // Trigger download
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}

/**
 * Export timesheets to JSON format with metadata
 */
export function exportTimesheetsToJSON(
  entries: TimesheetEntry[],
  options?: {
    filename?: string;
    metadata?: {
      exportDate?: string;
      dateRange?: { start: string; end: string };
      caregiver?: { id: string; name: string };
      summary?: {
        totalHours: number;
        totalPay: number;
        shiftCount: number;
        unpaidCount?: number;
        paidCount?: number;
      };
    };
  }
): void {
  const filename = options?.filename ?? `timesheets_${new Date().toISOString().split("T")[0]}.json`;

  // Build JSON structure
  const jsonData = {
    metadata: {
      exportDate: options?.metadata?.exportDate ?? new Date().toISOString(),
      dateRange: options?.metadata?.dateRange,
      caregiver: options?.metadata?.caregiver,
      summary: options?.metadata?.summary,
    },
    timesheets: entries.map((entry) => ({
      id: entry.id,
      shiftDate: entry.shiftDate,
      week: {
        start: entry.weekStart,
        end: entry.weekEnd,
      },
      caregiver: {
        id: entry.caregiver.id,
        name: entry.caregiver.name,
        payRate: entry.caregiver.payRate,
        payType: entry.caregiver.payType,
      },
      client: {
        id: entry.client.id,
        name: entry.client.name,
        address: entry.client.address,
      },
      clockIn: entry.clockIn,
      clockOut: entry.clockOut,
      breakMinutes: entry.breakMinutes,
      overtimeMinutes: entry.overtimeMinutes,
      billableHours: entry.billableHours,
      overtimeHours: entry.overtimeHours,
      payAmount: entry.payAmount,
      serviceType: entry.serviceType,
      fundingSource: entry.fundingSource,
      paymentStatus: entry.paymentStatus,
      timesheetStatus: entry.timesheetStatus,
      verificationStatus: entry.verificationStatus,
    })),
  };

  const jsonContent = JSON.stringify(jsonData, null, 2);

  // Trigger download
  downloadFile(jsonContent, filename, "application/json;charset=utf-8;");
}

/**
 * Export weekly summary to CSV
 */
export function exportWeeklySummaryToCSV(
  weeklyData: Array<{
    weekStart: string;
    weekEnd: string;
    entries: TimesheetEntry[];
    totalHours: number;
    totalPay: number;
  }>,
  options?: { filename?: string }
): void {
  const filename = options?.filename ?? `weekly_summary_${new Date().toISOString().split("T")[0]}.csv`;

  // Build CSV headers
  const headers = ["Week Start", "Week End", "Shift Count", "Total Hours", "Total Pay", "Unpaid Shifts", "Paid Shifts"];

  // Build CSV rows
  const rows = weeklyData.map((week) => [
    formatDate(week.weekStart),
    formatDate(week.weekEnd),
    week.entries.length.toString(),
    week.totalHours.toFixed(2),
    formatCurrency(week.totalPay),
    week.entries.filter((e) => e.paymentStatus === "unpaid").length.toString(),
    week.entries.filter((e) => e.paymentStatus === "paid").length.toString(),
  ]);

  // Add totals row
  const totalShifts = weeklyData.reduce((sum, week) => sum + week.entries.length, 0);
  const totalHours = weeklyData.reduce((sum, week) => sum + week.totalHours, 0);
  const totalPay = weeklyData.reduce((sum, week) => sum + week.totalPay, 0);
  const totalUnpaid = weeklyData.reduce(
    (sum, week) => sum + week.entries.filter((e) => e.paymentStatus === "unpaid").length,
    0
  );
  const totalPaid = weeklyData.reduce(
    (sum, week) => sum + week.entries.filter((e) => e.paymentStatus === "paid").length,
    0
  );

  rows.push([
    "TOTAL",
    "",
    totalShifts.toString(),
    totalHours.toFixed(2),
    formatCurrency(totalPay),
    totalUnpaid.toString(),
    totalPaid.toString(),
  ]);

  // Combine headers and rows
  const csvData = [headers, ...rows];
  const csvContent = arrayToCSV(csvData);

  // Trigger download
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}
