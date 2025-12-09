import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  Building2, 
  Users, 
  DollarSign, 
  Wrench, 
  FileCheck, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
  Home,
  FileText,
  UserPlus,
  Receipt,
  Activity
} from "lucide-react";
import type { DashboardWidgetConfig } from "@shared/schema";

interface WidgetProps {
  config: DashboardWidgetConfig;
}

function WidgetSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-32" />
      </CardContent>
    </Card>
  );
}

export function PropertyOverviewWidget({ config }: WidgetProps) {
  const { data: summary, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/summary"],
  });

  if (isLoading) return <WidgetSkeleton title={config.title || "Property Overview"} />;

  const totalProperties = summary?.properties?.total || 0;
  const totalUnits = (summary?.properties?.occupied || 0) + (summary?.properties?.vacant || 0);
  const occupancyRate = totalUnits > 0 
    ? Math.round((summary?.properties?.occupied || 0) / totalUnits * 100) 
    : 0;

  return (
    <Card data-testid="widget-property-overview">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{config.title || "Property Overview"}</CardTitle>
        <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalProperties}</div>
        <p className="text-xs text-muted-foreground">
          {totalUnits} units | {occupancyRate}% occupied
        </p>
        <Link href="/properties">
          <Button variant="ghost" size="sm" className="px-0 mt-2 text-primary hover:text-primary/80">
            View Properties <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function FinancialSummaryWidget({ config }: WidgetProps) {
  const { data: summary, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/summary"],
  });

  if (isLoading) return <WidgetSkeleton title={config.title || "Financial Summary"} />;

  const monthlyRentDue = summary?.financials?.monthlyRentDue || 0;
  const receivedThisMonth = summary?.financials?.receivedThisMonth || 0;
  const overdueAmount = summary?.financials?.overdueAmount || 0;
  const netIncome = receivedThisMonth - overdueAmount;

  return (
    <Card data-testid="widget-financial-summary">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{config.title || "Financial Summary"}</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Monthly Rent Due</span>
            <span className="font-medium flex items-center gap-1">
              ${monthlyRentDue.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Received This Month</span>
            <span className="font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              ${receivedThisMonth.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Overdue</span>
            <span className="font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              ${overdueAmount.toLocaleString()}
            </span>
          </div>
        </div>
        <Link href="/accounting">
          <Button variant="ghost" size="sm" className="px-0 mt-2 text-primary hover:text-primary/80">
            View Accounting <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function RentCollectionWidget({ config }: WidgetProps) {
  const { data: summary, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/summary"],
  });

  if (isLoading) return <WidgetSkeleton title={config.title || "Rent Collection"} />;

  const monthlyRentDue = summary?.financials?.monthlyRentDue || 0;
  const receivedThisMonth = summary?.financials?.receivedThisMonth || 0;
  const overdueAmount = summary?.financials?.overdueAmount || 0;
  const outstanding = monthlyRentDue - receivedThisMonth;

  return (
    <Card data-testid="widget-rent-collection">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{config.title || "Rent Collection"}</CardTitle>
        <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Collected</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              ${receivedThisMonth.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Outstanding</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">
              ${outstanding.toLocaleString()}
            </span>
          </div>
          {overdueAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overdue</span>
              <Badge variant="destructive" className="text-xs">
                ${overdueAmount.toLocaleString()}
              </Badge>
            </div>
          )}
        </div>
        <Link href="/rent-collection">
          <Button variant="ghost" size="sm" className="px-0 mt-2 text-primary hover:text-primary/80">
            View All Invoices <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function PendingExpensesWidget({ config }: WidgetProps) {
  const { data: expenses, isLoading } = useQuery<any[]>({
    queryKey: ["/api/expenses"],
  });

  if (isLoading) return <WidgetSkeleton title={config.title || "Pending Expenses"} />;

  const pendingExpenses = expenses?.filter(e => e.approvalStatus === "PENDING") || [];
  const totalPending = pendingExpenses.reduce((sum, e) => sum + Number(e.totalAmount || 0), 0);

  return (
    <Card data-testid="widget-pending-expenses">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{config.title || "Pending Expenses"}</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{pendingExpenses.length}</div>
        <p className="text-xs text-muted-foreground">
          ${totalPending.toLocaleString()} awaiting approval
        </p>
        {pendingExpenses.length > 0 && (
          <div className="mt-3 space-y-1">
            {pendingExpenses.slice(0, 3).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[150px]">{expense.description}</span>
                <Badge variant="outline">${Number(expense.totalAmount).toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        )}
        <Link href="/expenses">
          <Button variant="ghost" size="sm" className="px-0 mt-2 text-primary hover:text-primary/80">
            Review Expenses <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function MaintenanceOverviewWidget({ config }: WidgetProps) {
  const { data: pendingTasks, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/pending-tasks"],
  });

  if (isLoading) return <WidgetSkeleton title={config.title || "Maintenance"} />;

  const openIssues = pendingTasks?.maintenanceIssues?.length || 0;
  const urgentIssues = pendingTasks?.maintenanceIssues?.filter((i: any) => i.priority === "HIGH" || i.priority === "EMERGENCY") || [];
  const urgentCount = urgentIssues.length;

  return (
    <Card data-testid="widget-maintenance-overview">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{config.title || "Maintenance"}</CardTitle>
        <Wrench className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{openIssues}</div>
        <p className="text-xs text-muted-foreground">open issues</p>
        {urgentCount > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <Badge variant="destructive">{urgentCount} urgent</Badge>
          </div>
        )}
        <Link href="/maintenance">
          <Button variant="ghost" size="sm" className="px-0 mt-2 text-primary hover:text-primary/80">
            View Maintenance <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function ComplianceAlertsWidget({ config }: WidgetProps) {
  const { data: pendingTasks, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/pending-tasks"],
  });

  if (isLoading) return <WidgetSkeleton title={config.title || "Compliance Alerts"} />;

  const complianceAlerts = pendingTasks?.complianceAlerts || [];
  const expiredCount = complianceAlerts.filter((a: any) => a.computedStatus === "EXPIRED").length;
  const expiringCount = complianceAlerts.filter((a: any) => a.computedStatus === "EXPIRING_SOON").length;

  return (
    <Card data-testid="widget-compliance-alerts">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{config.title || "Compliance"}</CardTitle>
        <FileCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {expiredCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm">{expiredCount} expired documents</span>
            </div>
          )}
          {expiringCount > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm">{expiringCount} expiring soon</span>
            </div>
          )}
          {expiredCount === 0 && expiringCount === 0 && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">All documents up to date</span>
            </div>
          )}
        </div>
        <Link href="/compliance">
          <Button variant="ghost" size="sm" className="px-0 mt-2 text-primary hover:text-primary/80">
            View Compliance <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function QuickActionsWidget({ config }: WidgetProps) {
  return (
    <Card data-testid="widget-quick-actions">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{config.title || "Quick Actions"}</CardTitle>
        <PlusCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/properties">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Home className="mr-2 h-4 w-4" />
              Property
            </Button>
          </Link>
          <Link href="/tenants">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <UserPlus className="mr-2 h-4 w-4" />
              Tenant
            </Button>
          </Link>
          <Link href="/rent-collection">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Invoice
            </Button>
          </Link>
          <Link href="/expenses">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Receipt className="mr-2 h-4 w-4" />
              Expense
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentActivityWidget({ config }: WidgetProps) {
  const { data: summary, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/summary"],
  });

  if (isLoading) return <WidgetSkeleton title={config.title || "Recent Activity"} />;

  const activeTenants = summary?.tenants?.active || 0;
  const activeLeases = summary?.leases?.active || 0;
  const expiringLeases = summary?.leases?.expiringSoon || 0;
  const monthlyRentDue = summary?.financials?.monthlyRentDue || 0;
  const receivedThisMonth = summary?.financials?.receivedThisMonth || 0;

  return (
    <Card data-testid="widget-recent-activity">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{config.title || "Recent Activity"}</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span>Active Tenants</span>
            </div>
            <span className="font-medium">{activeTenants}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              <span>Active Leases</span>
            </div>
            <span className="font-medium">{activeLeases}</span>
          </div>
          {expiringLeases > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span>Expiring Soon</span>
              </div>
              <span className="font-medium">{expiringLeases}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span>Received This Month</span>
            </div>
            <span className="font-medium">${receivedThisMonth.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OccupancyChartWidget({ config }: WidgetProps) {
  const { data: summary, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/summary"],
  });

  if (isLoading) return <WidgetSkeleton title={config.title || "Occupancy"} />;

  const occupiedUnits = summary?.properties?.occupied || 0;
  const vacantUnits = summary?.properties?.vacant || 0;
  const totalUnits = occupiedUnits + vacantUnits;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  return (
    <Card data-testid="widget-occupancy-chart">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{config.title || "Occupancy"}</CardTitle>
        <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{occupancyRate}%</div>
        <p className="text-xs text-muted-foreground mb-3">occupancy rate</p>
        <div className="w-full bg-secondary rounded-full h-2 mb-3">
          <div 
            className="bg-primary h-2 rounded-full transition-all" 
            style={{ width: `${occupancyRate}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-green-600 dark:text-green-400">{occupiedUnits}</div>
            <div className="text-muted-foreground">Occupied</div>
          </div>
          <div>
            <div className="font-medium text-amber-600 dark:text-amber-400">{vacantUnits}</div>
            <div className="text-muted-foreground">Vacant</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TenantSummaryWidget({ config }: WidgetProps) {
  const { data: summary, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/summary"],
  });

  if (isLoading) return <WidgetSkeleton title={config.title || "Tenants"} />;

  const totalTenants = summary?.tenants?.total || 0;
  const activeLeases = summary?.leases?.active || 0;
  const expiringLeases = summary?.leases?.expiringSoon || 0;

  return (
    <Card data-testid="widget-tenant-summary">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{config.title || "Tenants"}</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalTenants}</div>
        <p className="text-xs text-muted-foreground">{activeLeases} active leases</p>
        {expiringLeases > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-muted-foreground">{expiringLeases} expiring soon</span>
          </div>
        )}
        <Link href="/tenants">
          <Button variant="ghost" size="sm" className="px-0 mt-2 text-primary hover:text-primary/80">
            View Tenants <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export const WIDGET_COMPONENTS: Record<string, React.ComponentType<WidgetProps>> = {
  property_overview: PropertyOverviewWidget,
  financial_summary: FinancialSummaryWidget,
  rent_collection: RentCollectionWidget,
  pending_expenses: PendingExpensesWidget,
  maintenance_overview: MaintenanceOverviewWidget,
  compliance_alerts: ComplianceAlertsWidget,
  quick_actions: QuickActionsWidget,
  recent_activity: RecentActivityWidget,
  occupancy_chart: OccupancyChartWidget,
  tenant_summary: TenantSummaryWidget,
};

export function DashboardWidget({ config }: WidgetProps) {
  const Component = WIDGET_COMPONENTS[config.widgetType];
  
  if (!Component) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Unknown widget: {config.widgetType}</p>
        </CardContent>
      </Card>
    );
  }

  return <Component config={config} />;
}
