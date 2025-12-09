import { useQuery } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardWidget, WIDGET_COMPONENTS } from "@/components/dashboard/widgets";
import { MobileQuickActionBar } from "@/components/mobile-quick-actions";
import { 
  WIDGET_DEFINITIONS, 
  DEFAULT_LAYOUTS_BY_ROLE, 
  getWidgetGridClass,
  getWidgetsForPermissions
} from "@/lib/widget-registry";
import { useAuth } from "@/hooks/use-auth";
import type { DashboardWidgetConfig, EffectiveDashboardLayout } from "@shared/schema";

interface UserPermissionsResponse {
  global: string[];
  byProperty: Record<number, string[]>;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: layoutData, isLoading: layoutLoading } = useQuery<{
    layoutId: number | null;
    layoutName: string;
    source: "USER" | "ROLE" | "DEFAULT";
    widgets: DashboardWidgetConfig[];
  }>({
    queryKey: ["/api/dashboard/layout"],
  });

  const { data: userPermissions } = useQuery<UserPermissionsResponse>({
    queryKey: ["/api/user/permissions"],
  });

  const isSuperAdmin = user?.isSuperAdmin === 1;

  const getEffectiveWidgets = (): DashboardWidgetConfig[] => {
    if (layoutData?.widgets && layoutData.widgets.length > 0) {
      return layoutData.widgets;
    }

    if (isSuperAdmin) {
      return DEFAULT_LAYOUTS_BY_ROLE.SUPER_ADMIN;
    }

    const allPermissions = [
      ...(userPermissions?.global || []),
      ...Object.values(userPermissions?.byProperty || {}).flat(),
    ];
    const uniquePermissions = Array.from(new Set(allPermissions));

    const permissionToRole: Record<string, string> = {
      "maintenance.view": "MAINTENANCE_SUPERVISOR",
      "maintenance.create": "MAINTENANCE_SUPERVISOR",
      "compliance.view": "COMPLIANCE_OFFICER",
      "accounting.view": "ACCOUNTANT",
      "payment.view": "ACCOUNTANT",
      "property.create": "PROPERTY_MANAGER",
      "property.edit": "PROPERTY_MANAGER",
    };

    for (const perm of uniquePermissions) {
      if (permissionToRole[perm]) {
        const roleName = permissionToRole[perm];
        if (DEFAULT_LAYOUTS_BY_ROLE[roleName]) {
          return DEFAULT_LAYOUTS_BY_ROLE[roleName];
        }
      }
    }

    if (uniquePermissions.includes("property.view")) {
      return DEFAULT_LAYOUTS_BY_ROLE.PROPERTY_MANAGER;
    }

    return DEFAULT_LAYOUTS_BY_ROLE.VIEWER;
  };

  const effectiveWidgets = getEffectiveWidgets();

  const filteredWidgets = effectiveWidgets.filter(widgetConfig => {
    const definition = WIDGET_DEFINITIONS.find(d => d.type === widgetConfig.widgetType);
    if (!definition) return false;

    if (isSuperAdmin) return true;

    const allPermissions = [
      ...(userPermissions?.global || []),
      ...Object.values(userPermissions?.byProperty || {}).flat(),
    ];

    return definition.requiredPermissions.every(perm => allPermissions.includes(perm));
  });

  const sortedWidgets = [...filteredWidgets].sort((a, b) => a.order - b.order);

  if (layoutLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Skeleton className="h-9 w-64 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 pb-24 md:pb-6" data-testid="dashboard-page">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold" data-testid="text-welcome">
                Welcome back, {user?.name?.split(" ")[0]}
              </h1>
              <p className="text-muted-foreground mt-1">
                {layoutData?.source === "USER" 
                  ? "Showing your customized dashboard" 
                  : layoutData?.source === "ROLE" 
                    ? `Showing ${layoutData?.layoutName}` 
                    : "Here's an overview of your property portfolio"}
              </p>
            </div>
            {isSuperAdmin && (
              <Link href="/admin/dashboard-settings">
                <Button variant="outline" size="sm" data-testid="button-dashboard-settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Customize Dashboard
                </Button>
              </Link>
            )}
          </div>

          {sortedWidgets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No widgets available for your current permissions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {sortedWidgets.map((widgetConfig) => {
                const gridClass = getWidgetGridClass(widgetConfig.size);
                return (
                  <div 
                    key={widgetConfig.id} 
                    className={gridClass}
                    data-testid={`widget-container-${widgetConfig.widgetType}`}
                  >
                    <DashboardWidget config={widgetConfig} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <MobileQuickActionBar />
    </>
  );
}
