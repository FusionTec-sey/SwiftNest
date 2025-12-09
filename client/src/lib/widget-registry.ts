import type { DashboardWidgetDefinition, DashboardWidgetConfig } from "@shared/schema";

export const WIDGET_DEFINITIONS: DashboardWidgetDefinition[] = [
  {
    type: "property_overview",
    title: "Property Overview",
    description: "Shows total properties, units, and occupancy rate",
    defaultSize: "SMALL",
    requiredPermissions: ["property.view"],
    availableSizes: ["SMALL", "MEDIUM"],
    category: "OVERVIEW",
  },
  {
    type: "financial_summary",
    title: "Financial Summary",
    description: "Shows revenue, expenses, and net income overview",
    defaultSize: "MEDIUM",
    requiredPermissions: ["finance.view_invoices"],
    availableSizes: ["SMALL", "MEDIUM", "LARGE"],
    category: "FINANCIAL",
  },
  {
    type: "rent_collection",
    title: "Rent Collection",
    description: "Shows rent collection status and overdue invoices",
    defaultSize: "MEDIUM",
    requiredPermissions: ["finance.view_invoices"],
    availableSizes: ["SMALL", "MEDIUM", "LARGE"],
    category: "FINANCIAL",
  },
  {
    type: "pending_expenses",
    title: "Pending Expenses",
    description: "Shows expenses awaiting approval",
    defaultSize: "MEDIUM",
    requiredPermissions: ["expense.view"],
    availableSizes: ["SMALL", "MEDIUM", "LARGE"],
    category: "FINANCIAL",
  },
  {
    type: "maintenance_overview",
    title: "Maintenance Overview",
    description: "Shows open issues, in-progress tasks, and urgent items",
    defaultSize: "MEDIUM",
    requiredPermissions: ["maintenance.view"],
    availableSizes: ["SMALL", "MEDIUM", "LARGE"],
    category: "MAINTENANCE",
  },
  {
    type: "compliance_alerts",
    title: "Compliance Alerts",
    description: "Shows expiring permits, licenses, and certificates",
    defaultSize: "MEDIUM",
    requiredPermissions: ["compliance.view"],
    availableSizes: ["SMALL", "MEDIUM", "LARGE"],
    category: "COMPLIANCE",
  },
  {
    type: "quick_actions",
    title: "Quick Actions",
    description: "Common actions like adding tenant, creating invoice",
    defaultSize: "SMALL",
    requiredPermissions: ["property.view"],
    availableSizes: ["SMALL", "MEDIUM"],
    category: "QUICK_ACTIONS",
  },
  {
    type: "recent_activity",
    title: "Recent Activity",
    description: "Shows recent payments, lease signings, and updates",
    defaultSize: "LARGE",
    requiredPermissions: ["reports.view_dashboard"],
    availableSizes: ["MEDIUM", "LARGE", "FULL"],
    category: "ACTIVITY",
  },
  {
    type: "occupancy_chart",
    title: "Occupancy Chart",
    description: "Visual breakdown of property occupancy",
    defaultSize: "MEDIUM",
    requiredPermissions: ["property.view"],
    availableSizes: ["MEDIUM", "LARGE"],
    category: "OVERVIEW",
  },
  {
    type: "tenant_summary",
    title: "Tenant Summary",
    description: "Shows tenant count and lease status breakdown",
    defaultSize: "SMALL",
    requiredPermissions: ["tenant.view"],
    availableSizes: ["SMALL", "MEDIUM"],
    category: "OVERVIEW",
  },
];

export const DEFAULT_LAYOUTS_BY_ROLE: Record<string, DashboardWidgetConfig[]> = {
  SUPER_ADMIN: [
    { id: "1", widgetType: "quick_actions", size: "SMALL", order: 1 },
    { id: "2", widgetType: "rent_collection", size: "MEDIUM", order: 2 },
    { id: "3", widgetType: "maintenance_overview", size: "MEDIUM", order: 3 },
    { id: "4", widgetType: "pending_expenses", size: "MEDIUM", order: 4 },
    { id: "5", widgetType: "property_overview", size: "SMALL", order: 5 },
    { id: "6", widgetType: "tenant_summary", size: "SMALL", order: 6 },
    { id: "7", widgetType: "compliance_alerts", size: "MEDIUM", order: 7 },
    { id: "8", widgetType: "recent_activity", size: "LARGE", order: 8 },
  ],
  PROPERTY_MANAGER: [
    { id: "1", widgetType: "quick_actions", size: "SMALL", order: 1 },
    { id: "2", widgetType: "rent_collection", size: "MEDIUM", order: 2 },
    { id: "3", widgetType: "maintenance_overview", size: "MEDIUM", order: 3 },
    { id: "4", widgetType: "property_overview", size: "SMALL", order: 4 },
    { id: "5", widgetType: "tenant_summary", size: "SMALL", order: 5 },
    { id: "6", widgetType: "compliance_alerts", size: "MEDIUM", order: 6 },
    { id: "7", widgetType: "recent_activity", size: "LARGE", order: 7 },
  ],
  ACCOUNTANT: [
    { id: "1", widgetType: "financial_summary", size: "LARGE", order: 1 },
    { id: "2", widgetType: "rent_collection", size: "LARGE", order: 2 },
    { id: "3", widgetType: "pending_expenses", size: "LARGE", order: 3 },
    { id: "4", widgetType: "recent_activity", size: "MEDIUM", order: 4 },
  ],
  MAINTENANCE_SUPERVISOR: [
    { id: "1", widgetType: "maintenance_overview", size: "LARGE", order: 1 },
    { id: "2", widgetType: "property_overview", size: "SMALL", order: 2 },
    { id: "3", widgetType: "quick_actions", size: "SMALL", order: 3 },
  ],
  COMPLIANCE_OFFICER: [
    { id: "1", widgetType: "compliance_alerts", size: "LARGE", order: 1 },
    { id: "2", widgetType: "property_overview", size: "SMALL", order: 2 },
    { id: "3", widgetType: "recent_activity", size: "MEDIUM", order: 3 },
  ],
  VIEWER: [
    { id: "1", widgetType: "property_overview", size: "MEDIUM", order: 1 },
    { id: "2", widgetType: "tenant_summary", size: "SMALL", order: 2 },
    { id: "3", widgetType: "occupancy_chart", size: "MEDIUM", order: 3 },
  ],
};

export function getWidgetDefinition(widgetType: string): DashboardWidgetDefinition | undefined {
  return WIDGET_DEFINITIONS.find(w => w.type === widgetType);
}

export function getWidgetsForPermissions(userPermissions: string[]): DashboardWidgetDefinition[] {
  return WIDGET_DEFINITIONS.filter(widget => 
    widget.requiredPermissions.some(perm => userPermissions.includes(perm))
  );
}

export function getDefaultLayoutForRole(roleName: string): DashboardWidgetConfig[] {
  return DEFAULT_LAYOUTS_BY_ROLE[roleName] || DEFAULT_LAYOUTS_BY_ROLE.VIEWER;
}

export function getWidgetGridClass(size: string): string {
  switch (size) {
    case "SMALL":
      return "col-span-1";
    case "MEDIUM":
      return "col-span-1 md:col-span-2";
    case "LARGE":
      return "col-span-1 md:col-span-2 lg:col-span-3";
    case "FULL":
      return "col-span-full";
    default:
      return "col-span-1";
  }
}
