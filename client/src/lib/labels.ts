/**
 * User-friendly labels for enum values
 * Converts technical enum values to readable text for normal users
 */

// Property usage type labels
export const usageTypeLabels: Record<string, string> = {
  LONG_TERM_RENTAL: "Long-Term Rental",
  SHORT_TERM_RENTAL: "Short-Term Rental",
  OWNER_OCCUPIED: "Owner Occupied",
};

// Invoice status labels
export const invoiceStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  ISSUED: "Awaiting Payment",
  PAID: "Paid",
  PARTIALLY_PAID: "Partially Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  VOID: "Void",
};

// Lease status labels
export const leaseStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
};

// Maintenance issue status labels
export const issueStatusLabels: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  PENDING_PARTS: "Waiting for Parts",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

// Maintenance issue severity labels
export const issueSeverityLabels: Record<string, string> = {
  LOW: "Low Priority",
  MEDIUM: "Medium Priority",
  HIGH: "High Priority",
  CRITICAL: "Critical",
};

// Unit status labels
export const unitStatusLabels: Record<string, string> = {
  VACANT: "Vacant",
  OCCUPIED: "Occupied",
  MAINTENANCE: "Under Maintenance",
  RESERVED: "Reserved",
};

// Turnover status labels
export const turnoverStatusLabels: Record<string, string> = {
  PENDING: "Pending",
  CLEANING: "Cleaning",
  READY: "Ready",
  OCCUPIED: "Occupied",
};

// Guest status labels
export const guestStatusLabels: Record<string, string> = {
  EXPECTED: "Expected",
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Checked Out",
  NO_SHOW: "No Show",
  CANCELLED: "Cancelled",
};

// Property type labels (for property form)
export const propertyTypeLabels: Record<string, string> = {
  APARTMENT: "Apartment",
  VILLA: "Villa",
  HOUSE: "House",
  TOWNHOUSE: "Townhouse",
  PLOT: "Plot",
  LAND: "Land",
  OFFICE: "Office",
  SHOP: "Shop",
  WAREHOUSE: "Warehouse",
  INDUSTRIAL: "Industrial",
  MIXED_USE: "Mixed Use",
};

// Expense category labels
export const expenseCategoryLabels: Record<string, string> = {
  MAINTENANCE: "Maintenance",
  UTILITIES: "Utilities",
  INSURANCE: "Insurance",
  TAXES: "Taxes",
  SUPPLIES: "Supplies",
  PROFESSIONAL_SERVICES: "Professional Services",
  ADVERTISING: "Advertising",
  LEGAL: "Legal",
  MANAGEMENT_FEES: "Management Fees",
  OTHER: "Other",
};

// Payment method labels
export const paymentMethodLabels: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHECK: "Check",
  CARD: "Credit/Debit Card",
  MOBILE_MONEY: "Mobile Money",
  OTHER: "Other",
};

/**
 * Get a user-friendly label for any enum value
 * Falls back to formatting the raw value if not found
 */
export function getLabel(value: string, labelMap: Record<string, string>): string {
  return labelMap[value] || value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
