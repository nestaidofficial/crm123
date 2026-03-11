import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import * as XLSX from "xlsx";
import {
  mapClaimRowToApi,
  mapClaimLineRowToApi,
  type BillingClaimRow,
  type BillingClaimLineRow,
  type BillingProviderConfigRow,
} from "@/lib/db/billing.mapper";

type ExportFormat = "csv" | "excel" | "json" | "clearinghouse-csv" | "clearinghouse-excel" | "comprehensive-csv";

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function errorResponse(message: string, status: number): NextResponse {
  return jsonResponse({ error: message }, status);
}

function formatDate(isoDate: string): string {
  return isoDate.split("T")[0];
}

function arrayToCSV(data: string[][]): string {
  return data
    .map((row) =>
      row
        .map((cell) => {
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
 * POST /api/billing/claims/export
 * Server-side bulk export of claims in various formats
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      format = "csv",
      claimIds = [],
      includeLineItems = true,
      includeEVVData = true,
      filters = {},
    } = body as {
      format?: ExportFormat;
      claimIds?: string[];
      includeLineItems?: boolean;
      includeEVVData?: boolean;
      filters?: {
        status?: string;
        payerId?: string;
        startDate?: string;
        endDate?: string;
      };
    };

    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { supabase, agencyId } = auth;

    let query = supabase
      .from("billing_claims")
      .select(`
        *,
        client:clients(id, first_name, last_name, dob, gender, address),
        payer:billing_payers(id, name, payer_type, state, electronic_payer_id)
      `);

    if (claimIds.length > 0) {
      query = query.in("id", claimIds);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.payerId) {
      query = query.eq("payer_id", filters.payerId);
    }

    if (filters.startDate) {
      query = query.gte("billing_period_start", filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte("billing_period_end", filters.endDate);
    }

    query = query.order("billing_period_start", { ascending: false });

    const { data: claimRows, error: claimsError } = await query;

    if (claimsError) {
      console.error("Failed to fetch claims:", claimsError);
      return errorResponse("Failed to fetch claims", 500);
    }

    if (!claimRows || claimRows.length === 0) {
      return errorResponse("No claims found matching criteria", 404);
    }

    let lineItemsMap: Record<string, any[]> = {};
    if (includeLineItems && (format === "excel" || format.includes("clearinghouse"))) {
      const { data: lineRows } = await supabase
        .from("billing_claim_lines")
        .select("*")
        .in(
          "claim_id",
          claimRows.map((c) => c.id)
        )
        .order("sort_order", { ascending: true });

      if (lineRows) {
        lineItemsMap = lineRows.reduce((acc, line) => {
          if (!acc[line.claim_id]) acc[line.claim_id] = [];
          acc[line.claim_id].push(mapClaimLineRowToApi(line as BillingClaimLineRow));
          return acc;
        }, {} as Record<string, any[]>);
      }
    }

    const claims = claimRows.map((row) => ({
      ...mapClaimRowToApi(row as BillingClaimRow),
      client: row.client,
      payer: row.payer,
      lines: lineItemsMap[row.id] || [],
    }));

    const timestamp = new Date().toISOString().split("T")[0];

    switch (format) {
      case "csv": {
        const headers = [
          "Claim Number",
          "Client",
          "Payer",
          "State",
          "Billing Period Start",
          "Billing Period End",
          "Total Amount",
          "Paid Amount",
          "Balance",
          "Status",
          "Submission Date",
          "Filing Deadline",
        ];

        const rows = claims.map((claim) => [
          claim.claimNumber,
          claim.client ? `${claim.client.first_name} ${claim.client.last_name}` : "",
          claim.payer?.name || "",
          claim.payer?.state || "",
          formatDate(claim.billingPeriodStart),
          formatDate(claim.billingPeriodEnd),
          claim.totalAmount.toFixed(2),
          claim.paidAmount.toFixed(2),
          (claim.totalAmount - claim.paidAmount).toFixed(2),
          claim.status,
          claim.submissionDate ? formatDate(claim.submissionDate) : "",
          claim.filingDeadline ? formatDate(claim.filingDeadline) : "",
        ]);

        const csvContent = arrayToCSV([headers, ...rows]);

        return new NextResponse(csvContent, {
          headers: {
            "Content-Type": "text/csv;charset=utf-8;",
            "Content-Disposition": `attachment; filename="claims_${timestamp}.csv"`,
          },
        });
      }

      case "excel": {
        const workbook = XLSX.utils.book_new();

        const summaryData = claims.map((claim) => ({
          "Claim Number": claim.claimNumber,
          "Client": claim.client ? `${claim.client.first_name} ${claim.client.last_name}` : "",
          "Payer": claim.payer?.name || "",
          "State": claim.payer?.state || "",
          "Billing Period Start": formatDate(claim.billingPeriodStart),
          "Billing Period End": formatDate(claim.billingPeriodEnd),
          "Total Amount": claim.totalAmount,
          "Paid Amount": claim.paidAmount,
          "Balance": claim.totalAmount - claim.paidAmount,
          "Status": claim.status,
          "Submission Date": claim.submissionDate ? formatDate(claim.submissionDate) : "",
          "Response Date": claim.responseDate ? formatDate(claim.responseDate) : "",
          "Filing Deadline": claim.filingDeadline ? formatDate(claim.filingDeadline) : "",
        }));

        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        summarySheet["!cols"] = Array(13).fill({ wch: 15 });
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Claims Summary");

        if (includeLineItems) {
          const lineItemData = claims.flatMap((claim) =>
            (claim.lines || []).map((line: any) => ({
              "Claim Number": claim.claimNumber,
              "Service Date": formatDate(line.serviceDate),
              "Procedure Code": line.serviceCode,
              "Modifier": line.modifier || "",
              "Units": line.units,
              "Rate": line.rate,
              "Amount": line.amount,
              "Place of Service": line.placeOfService,
              "Diagnosis Code": line.diagnosisCode || "",
              ...(includeEVVData && {
                "EVV Clock In": line.evvClockIn || "",
                "EVV Clock Out": line.evvClockOut || "",
                "EVV Lat In": line.evvGpsLatIn?.toString() || "",
                "EVV Lon In": line.evvGpsLonIn?.toString() || "",
                "EVV Lat Out": line.evvGpsLatOut?.toString() || "",
                "EVV Lon Out": line.evvGpsLonOut?.toString() || "",
              }),
            }))
          );

          if (lineItemData.length > 0) {
            const lineItemSheet = XLSX.utils.json_to_sheet(lineItemData);
            lineItemSheet["!cols"] = Array(includeEVVData ? 15 : 9).fill({ wch: 15 });
            XLSX.utils.book_append_sheet(workbook, lineItemSheet, "Line Items");
          }
        }

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

        return new NextResponse(excelBuffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="claims_${timestamp}.xlsx"`,
          },
        });
      }

      case "clearinghouse-csv":
      case "clearinghouse-excel": {
        const { data: providerConfigRow } = await supabase
          .from("billing_provider_config")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!providerConfigRow) {
          return errorResponse("Provider configuration not found", 400);
        }

        const providerConfig = providerConfigRow as BillingProviderConfigRow;

        const flattenedData = claims.flatMap((claim) =>
          (claim.lines || []).map((line: any) => ({
            "Claim Number": claim.claimNumber,
            "Provider NPI": providerConfig.npi,
            "Provider Tax ID": providerConfig.tax_id,
            "Provider Name": providerConfig.provider_name,
            "Provider Address": providerConfig.billing_address?.street || "",
            "Provider City": providerConfig.billing_address?.city || "",
            "Provider State": providerConfig.billing_address?.state || "",
            "Provider ZIP": providerConfig.billing_address?.zip || "",
            "Payer Name": claim.payer?.name || "",
            "Payer ID": claim.payer?.electronic_payer_id || "",
            "Patient First Name": claim.client?.first_name || "",
            "Patient Last Name": claim.client?.last_name || "",
            "Patient DOB": claim.client?.dob ? formatDate(claim.client.dob) : "",
            "Member ID": "",
            "Patient Address": claim.client?.address?.street || "",
            "Patient City": claim.client?.address?.city || "",
            "Patient State": claim.client?.address?.state || "",
            "Patient ZIP": claim.client?.address?.zip || "",
            "Service Date": formatDate(line.serviceDate),
            "Procedure Code": line.serviceCode,
            "Modifier": line.modifier || "",
            "Units": line.units,
            "Charge Amount": line.amount,
            "Diagnosis Code": line.diagnosisCode || "",
            "Place of Service": line.placeOfService,
            "EVV Clock In": line.evvClockIn || "",
            "EVV Clock Out": line.evvClockOut || "",
            "EVV Latitude In": line.evvGpsLatIn?.toString() || "",
            "EVV Longitude In": line.evvGpsLonIn?.toString() || "",
            "EVV Latitude Out": line.evvGpsLatOut?.toString() || "",
            "EVV Longitude Out": line.evvGpsLonOut?.toString() || "",
          }))
        );

        if (format === "clearinghouse-csv") {
          const headers = Object.keys(flattenedData[0] || {});
          const rows = flattenedData.map((row) => headers.map((h) => row[h as keyof typeof row]?.toString() || ""));
          const csvContent = arrayToCSV([headers, ...rows]);

          return new NextResponse(csvContent, {
            headers: {
              "Content-Type": "text/csv;charset=utf-8;",
              "Content-Disposition": `attachment; filename="clearinghouse_${timestamp}.csv"`,
            },
          });
        } else {
          const workbook = XLSX.utils.book_new();
          const sheet = XLSX.utils.json_to_sheet(flattenedData);
          sheet["!cols"] = Array(30).fill({ wch: 15 });
          XLSX.utils.book_append_sheet(workbook, sheet, "Clearinghouse Data");

          const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

          return new NextResponse(excelBuffer, {
            headers: {
              "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "Content-Disposition": `attachment; filename="clearinghouse_${timestamp}.xlsx"`,
            },
          });
        }
      }

      case "json": {
        const jsonContent = JSON.stringify(claims, null, 2);

        return new NextResponse(jsonContent, {
          headers: {
            "Content-Type": "application/json;charset=utf-8;",
            "Content-Disposition": `attachment; filename="claims_${timestamp}.json"`,
          },
        });
      }

      case "comprehensive-csv": {
        // Fetch provider config
        const { data: providerConfigRow } = await supabase
          .from("billing_provider_config")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!providerConfigRow) {
          return errorResponse("Provider configuration not found", 400);
        }

        const providerConfig = providerConfigRow as BillingProviderConfigRow;

        // Fetch all claim lines with full joins
        const { data: claimLinesData, error: linesError } = await supabase
          .from("billing_claim_lines")
          .select(`
            *,
            claim:billing_claims(
              id,
              claim_number,
              client_id,
              payer_id,
              client_payer_assignment_id
            ),
            evv_visit:evv_visits(
              id,
              employee_id,
              scheduled_start,
              scheduled_end,
              clock_in,
              clock_out,
              gps_distance_meters,
              arrival_status,
              verification_status,
              care_notes_text
            )
          `)
          .in(
            "claim_id",
            claimRows.map((c) => c.id)
          )
          .order("sort_order", { ascending: true });

        if (linesError) {
          console.error("Failed to fetch claim lines:", linesError);
          return errorResponse("Failed to fetch claim line details", 500);
        }

        // Fetch client payer assignments
        const assignmentIds = claimRows
          .map((c) => c.client_payer_assignment_id)
          .filter((id): id is string => !!id);

        const { data: assignments } = await supabase
          .from("client_payer_assignments")
          .select("*")
          .in("id", assignmentIds);

        const assignmentsMap = (assignments || []).reduce((acc, a) => {
          acc[a.id] = a;
          return acc;
        }, {} as Record<string, any>);

        // Fetch employees for caregivers
        const employeeIds = (claimLinesData || [])
          .map((line: any) => line.evv_visit?.employee_id)
          .filter((id): id is string => !!id);

        const { data: employees } = await supabase
          .from("employees")
          .select("id, first_name, last_name, npi")
          .in("id", [...new Set(employeeIds)]);

        const employeesMap = (employees || []).reduce((acc, e) => {
          acc[e.id] = e;
          return acc;
        }, {} as Record<string, any>);

        // Fetch service codes for unit type
        const serviceCodeIds = (claimLinesData || [])
          .map((line: any) => line.service_code_id)
          .filter((id): id is string => !!id);

        const { data: serviceCodes } = await supabase
          .from("billing_service_codes")
          .select("id, unit_type")
          .in("id", [...new Set(serviceCodeIds)]);

        const serviceCodesMap = (serviceCodes || []).reduce((acc, s) => {
          acc[s.id] = s;
          return acc;
        }, {} as Record<string, any>);

        // Build comprehensive CSV rows
        const comprehensiveHeaders = [
          // A) Agency/Provider
          "Agency Legal Name",
          "Agency Address",
          "Agency City",
          "Agency State",
          "Agency ZIP",
          "Agency TIN/Tax ID",
          "Agency NPI",
          "Agency Taxonomy Code",
          "Medicaid Provider ID",
          "MCO Contract ID",
          
          // B) Client/Member
          "Member/Medicaid ID",
          "Client First Name",
          "Client Last Name",
          "Client DOB",
          "Client Gender",
          "Client Address",
          "Client City",
          "Client State",
          "Client ZIP",
          "Payer Name",
          "Payer Type",
          "Payer State",
          "Electronic Payer ID",
          "Authorization Number",
          "Authorized Units",
          "Used Units",
          "Auth Start Date",
          "Auth End Date",
          
          // C) Caregiver/Rendering
          "Caregiver First Name",
          "Caregiver Last Name",
          "Caregiver Internal ID",
          "Caregiver NPI",
          "Caregiver Credentials",
          
          // D) EVV Visit
          "Visit ID",
          "Scheduled Start",
          "Scheduled End",
          "Actual Clock In",
          "Actual Clock Out",
          "GPS Lat In",
          "GPS Lon In",
          "GPS Lat Out",
          "GPS Lon Out",
          "GPS Distance (m)",
          "Arrival Status",
          "Verification Status",
          "Exception/Attestation Notes",
          
          // E) Claim-Ready Service Lines
          "Claim Number",
          "Service Date",
          "HCPCS/CPT Code",
          "Modifier",
          "Units",
          "Unit Type",
          "Rate",
          "Charge Amount",
          "Diagnosis Code",
          "Place of Service",
          "Rendering Provider NPI",
          "Visit ID Link",
          "Authorization ID Link",
        ];

        const comprehensiveRows = (claimLinesData || []).map((line: any) => {
          const claim = claimRows.find((c) => c.id === line.claim_id);
          const client = claim?.client;
          const payer = claim?.payer;
          const assignment = claim?.client_payer_assignment_id
            ? assignmentsMap[claim.client_payer_assignment_id]
            : null;
          const evvVisit = line.evv_visit;
          const employee = evvVisit?.employee_id ? employeesMap[evvVisit.employee_id] : null;
          const serviceCode = line.service_code_id ? serviceCodesMap[line.service_code_id] : null;

          // Get Medicaid provider ID for this payer's state
          const payerState = payer?.state || "";
          const medicaidProviderId = providerConfig.state_provider_ids?.[payerState] || "";

          return [
            // A) Agency/Provider
            providerConfig.provider_name || "",
            providerConfig.billing_address?.street || "",
            providerConfig.billing_address?.city || "",
            providerConfig.billing_address?.state || "",
            providerConfig.billing_address?.zip || "",
            providerConfig.tax_id || "",
            providerConfig.npi || "",
            providerConfig.taxonomy_code || "",
            medicaidProviderId,
            "", // MCO Contract ID - not currently stored
            
            // B) Client/Member
            assignment?.member_id || "",
            client?.first_name || "",
            client?.last_name || "",
            client?.dob ? formatDate(client.dob) : "",
            client?.gender || "",
            client?.address?.street || "",
            client?.address?.city || "",
            client?.address?.state || "",
            client?.address?.zip || "",
            payer?.name || "",
            payer?.payer_type || "",
            payer?.state || "",
            payer?.electronic_payer_id || "",
            assignment?.authorization_number || "",
            assignment?.authorized_units?.toString() || "",
            assignment?.used_units?.toString() || "",
            assignment?.authorization_start ? formatDate(assignment.authorization_start) : "",
            assignment?.authorization_end ? formatDate(assignment.authorization_end) : "",
            
            // C) Caregiver/Rendering
            employee?.first_name || "",
            employee?.last_name || "",
            employee?.id || "",
            employee?.npi || "",
            "", // Credentials - not currently stored in a structured way
            
            // D) EVV Visit
            evvVisit?.id || "",
            evvVisit?.scheduled_start || "",
            evvVisit?.scheduled_end || "",
            evvVisit?.clock_in || "",
            evvVisit?.clock_out || "",
            line.evv_gps_lat_in?.toString() || "",
            line.evv_gps_lon_in?.toString() || "",
            line.evv_gps_lat_out?.toString() || "",
            line.evv_gps_lon_out?.toString() || "",
            evvVisit?.gps_distance_meters?.toString() || "",
            evvVisit?.arrival_status || "",
            evvVisit?.verification_status || "",
            evvVisit?.care_notes_text || "",
            
            // E) Claim-Ready Service Lines
            claim?.claim_number || "",
            formatDate(line.service_date),
            line.service_code || "",
            line.modifier || "",
            line.units.toFixed(2),
            serviceCode?.unit_type || "",
            line.rate.toFixed(2),
            line.amount.toFixed(2),
            line.diagnosis_code || "",
            line.place_of_service || "",
            line.rendering_provider_npi || "",
            line.evv_visit_id || "",
            claim?.client_payer_assignment_id || "",
          ];
        });

        const csvContent = arrayToCSV([comprehensiveHeaders, ...comprehensiveRows]);

        return new NextResponse(csvContent, {
          headers: {
            "Content-Type": "text/csv;charset=utf-8;",
            "Content-Disposition": `attachment; filename="comprehensive_claims_${timestamp}.csv"`,
          },
        });
      }

      default:
        return errorResponse("Unsupported export format", 400);
    }
  } catch (e) {
    console.error("Unexpected error in POST /api/billing/claims/export:", e);
    const message = e instanceof Error ? e.message : "An unexpected error occurred";
    return errorResponse(message, 500);
  }
}
