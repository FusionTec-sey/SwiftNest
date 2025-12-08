import { useQuery } from "@tanstack/react-query";
import { 
  Building2, Home, Plus, Users, TrendingUp, Store, MapPin, Building, 
  AlertTriangle, Calendar, DollarSign, FileText, Wrench, CreditCard, 
  ArrowRight, Clock, CheckCircle, UserPlus, Receipt, PiggyBank, FileCheck,
  AlertCircle, ClipboardList, Timer
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/stats-card";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import type { Property, Unit, ComplianceDocument, MaintenanceIssue, RentInvoice } from "@shared/schema";

type PropertyWithUnits = Property & { units: Unit[] };

interface ComplianceDocumentWithStatus extends ComplianceDocument {
  computedStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NOT_APPLICABLE";
  daysUntilExpiry: number | null;
  entityName?: string;
}

interface DashboardSummary {
  properties: { total: number; occupied: number; vacant: number };
  tenants: { total: number; active: number };
  leases: { active: number; expiringSoon: number };
  financials: { monthlyRentDue: number; overdueAmount: number; receivedThisMonth: number };
  loans: { total: number; totalOutstanding: number };
  assets: { total: number; totalValue: number };
}

interface PendingTasks {
  maintenanceIssues: (MaintenanceIssue & { property?: Property })[];
  maintenanceTasks: any[];
  overdueInvoices: (RentInvoice & { tenantName?: string; propertyName?: string })[];
  complianceAlerts: ComplianceDocumentWithStatus[];
  counts: {
    openIssues: number;
    pendingTasks: number;
    overdueInvoices: number;
    complianceAlerts: number;
  };
}

const propertyTypeIcons: Record<string, typeof Building2> = {
  APARTMENT: Building,
  VILLA: Home,
  PLOT: MapPin,
  OFFICE: Building2,
  SHOP: Store,
};

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: properties, isLoading } = useQuery<PropertyWithUnits[]>({
    queryKey: ["/api/properties"],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/reports/dashboard-summary"],
  });

  const { data: pendingTasks } = useQuery<PendingTasks>({
    queryKey: ["/api/dashboard/pending-tasks"],
  });

  const totalProperties = properties?.length || 0;
  const totalUnits = properties?.reduce((acc, p) => acc + (p.units?.length || 0), 0) || 0;
  const vacantUnits = properties?.reduce(
    (acc, p) => acc + (p.units?.filter((u) => u.status === "VACANT").length || 0),
    0
  ) || 0;
  const occupiedUnits = totalUnits - vacantUnits;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const quickActions = [
    { label: "Collect Rent", href: "/rent-collection", icon: Receipt, color: "text-green-600 dark:text-green-400" },
    { label: "Add Tenant", href: "/tenants", icon: UserPlus, color: "text-blue-600 dark:text-blue-400" },
    { label: "View Reports", href: "/reports", icon: FileText, color: "text-orange-600 dark:text-orange-400" },
    { label: "New Lease", href: "/leases", icon: Plus, color: "text-purple-600 dark:text-purple-400" },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  const totalPendingItems = pendingTasks ? 
    pendingTasks.counts.openIssues + pendingTasks.counts.overdueInvoices + pendingTasks.counts.complianceAlerts : 0;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-welcome">
              Welcome back, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground mt-1">
              {totalPendingItems > 0 
                ? `You have ${totalPendingItems} item${totalPendingItems > 1 ? 's' : ''} requiring attention`
                : "Here's an overview of your property portfolio"
              }
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.slice(0, 2).map((action) => (
              <Link key={action.href} href={action.href}>
                <Button variant="outline" className="gap-2" data-testid={`button-quick-${action.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                  {action.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {(isLoading || summaryLoading) ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Total Properties"
                value={totalProperties}
                icon={Building2}
              />
              <StatsCard
                title="Occupancy Rate"
                value={`${occupancyRate}%`}
                icon={TrendingUp}
                className={occupancyRate >= 80 ? "bg-green-50 dark:bg-green-950/20" : occupancyRate >= 50 ? "bg-amber-50 dark:bg-amber-950/20" : ""}
              />
              <StatsCard
                title="Open Issues"
                value={pendingTasks?.counts.openIssues || 0}
                icon={Wrench}
                className={pendingTasks?.counts.openIssues ? "bg-amber-50 dark:bg-amber-950/20" : ""}
              />
              <StatsCard
                title="Overdue Rent"
                value={summary ? formatCurrency(summary.financials.overdueAmount) : formatCurrency(0)}
                icon={DollarSign}
                className={summary?.financials.overdueAmount ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20"}
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {(pendingTasks?.maintenanceIssues.length || 0) > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Wrench className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          Open Maintenance Issues
                          <Badge variant="secondary" className="ml-1">
                            {pendingTasks?.counts.openIssues || 0}
                          </Badge>
                        </CardTitle>
                        <Link href="/properties">
                          <Button variant="ghost" size="sm" data-testid="link-view-all-issues">
                            View All
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {pendingTasks?.maintenanceIssues.slice(0, 5).map((issue) => (
                          <Link key={issue.id} href={`/properties/${issue.propertyId}/maintenance`}>
                            <div 
                              className="flex items-center gap-4 p-3 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                              data-testid={`issue-item-${issue.id}`}
                            >
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                                issue.severity === "URGENT" ? "bg-red-100 dark:bg-red-900/30" :
                                issue.severity === "HIGH" ? "bg-orange-100 dark:bg-orange-900/30" :
                                "bg-amber-100 dark:bg-amber-900/30"
                              }`}>
                                <AlertCircle className={`h-5 w-5 ${
                                  issue.severity === "URGENT" ? "text-red-600 dark:text-red-400" :
                                  issue.severity === "HIGH" ? "text-orange-600 dark:text-orange-400" :
                                  "text-amber-600 dark:text-amber-400"
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{issue.title}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                  <span>{issue.category}</span>
                                  {issue.dueAt && (
                                    <>
                                      <span>-</span>
                                      <span className="flex items-center gap-1">
                                        <Timer className="h-3 w-3" />
                                        Due {formatDate(issue.dueAt)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Badge variant={issue.severity === "URGENT" ? "destructive" : "secondary"} className="shrink-0">
                                {issue.severity}
                              </Badge>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(pendingTasks?.overdueInvoices.length || 0) > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
                          Overdue Invoices
                          <Badge variant="destructive" className="ml-1">
                            {pendingTasks?.counts.overdueInvoices || 0}
                          </Badge>
                        </CardTitle>
                        <Link href="/rent-collection">
                          <Button variant="ghost" size="sm" data-testid="link-view-all-invoices">
                            View All
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {pendingTasks?.overdueInvoices.slice(0, 5).map((invoice) => (
                          <Link key={invoice.id} href="/rent-collection">
                            <div 
                              className="flex items-center gap-4 p-3 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                              data-testid={`invoice-item-${invoice.id}`}
                            >
                              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                                <Receipt className="h-5 w-5 text-red-600 dark:text-red-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {invoice.tenantName || `Invoice #${invoice.invoiceNumber}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Due {formatDate(invoice.dueDate)}
                                </p>
                              </div>
                              <span className="text-lg font-semibold text-red-600 dark:text-red-400 shrink-0">
                                {formatCurrency(parseFloat(invoice.totalAmount) - parseFloat(invoice.amountPaid || "0"))}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(pendingTasks?.complianceAlerts.length || 0) > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          Compliance Alerts
                          <Badge variant="secondary" className="ml-1">
                            {pendingTasks?.counts.complianceAlerts || 0}
                          </Badge>
                        </CardTitle>
                        <Link href="/compliance">
                          <Button variant="ghost" size="sm" data-testid="link-view-all-compliance">
                            View All
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {pendingTasks?.complianceAlerts.slice(0, 5).map((doc) => (
                          <Link key={doc.id} href="/compliance">
                            <div 
                              className="flex items-center gap-4 p-3 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                              data-testid={`compliance-item-${doc.id}`}
                            >
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                                doc.computedStatus === "EXPIRED" ? "bg-red-100 dark:bg-red-900/30" : "bg-orange-100 dark:bg-orange-900/30"
                              }`}>
                                <FileCheck className={`h-5 w-5 ${
                                  doc.computedStatus === "EXPIRED" ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{doc.documentType.replace(/_/g, " ")}</p>
                                <p className="text-sm text-muted-foreground">
                                  {doc.computedStatus === "EXPIRED" 
                                    ? `Expired ${Math.abs(doc.daysUntilExpiry || 0)} days ago`
                                    : `Expires in ${doc.daysUntilExpiry} days`
                                  }
                                </p>
                              </div>
                              <Badge variant={doc.computedStatus === "EXPIRED" ? "destructive" : "secondary"} className="shrink-0">
                                {doc.computedStatus === "EXPIRED" ? "Expired" : "Expiring"}
                              </Badge>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!pendingTasks?.maintenanceIssues.length && !pendingTasks?.overdueInvoices.length && !pendingTasks?.complianceAlerts.length && (
                  <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800 dark:text-green-200">All Caught Up!</p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          No pending maintenance issues, overdue invoices, or compliance alerts.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                {summary && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Financial Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">Monthly Rent Due</span>
                          <span className="font-semibold" data-testid="stat-monthly-rent-due">
                            {formatCurrency(summary.financials.monthlyRentDue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">Received This Month</span>
                          <span className="font-semibold text-green-600 dark:text-green-400" data-testid="stat-received-this-month">
                            {formatCurrency(summary.financials.receivedThisMonth)}
                          </span>
                        </div>
                        {summary.financials.monthlyRentDue > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-1 gap-2">
                              <span className="text-sm text-muted-foreground">Collection Rate</span>
                              <span className="text-sm font-medium">
                                {Math.round((summary.financials.receivedThisMonth / summary.financials.monthlyRentDue) * 100)}%
                              </span>
                            </div>
                            <Progress 
                              value={Math.min(100, (summary.financials.receivedThisMonth / summary.financials.monthlyRentDue) * 100)} 
                              className="h-2" 
                            />
                          </div>
                        )}
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-muted-foreground">Outstanding Loans</span>
                            <span className="font-semibold" data-testid="stat-outstanding-loans">
                              {formatCurrency(summary.loans.totalOutstanding)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Portfolio Overview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Link href="/tenants">
                          <div className="flex items-center justify-between p-2 -mx-2 rounded-md hover-elevate cursor-pointer" data-testid="link-tenants-overview">
                            <div className="flex items-center gap-3">
                              <Users className="h-5 w-5 text-muted-foreground" />
                              <span className="text-sm">Active Tenants</span>
                            </div>
                            <span className="font-semibold" data-testid="stat-active-tenants">{summary.tenants.active}</span>
                          </div>
                        </Link>
                        <Link href="/leases">
                          <div className="flex items-center justify-between p-2 -mx-2 rounded-md hover-elevate cursor-pointer" data-testid="link-leases-overview">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <span className="text-sm">Active Leases</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold" data-testid="stat-active-leases">{summary.leases.active}</span>
                              {summary.leases.expiringSoon > 0 && (
                                <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
                                  {summary.leases.expiringSoon} expiring
                                </Badge>
                              )}
                            </div>
                          </div>
                        </Link>
                        <Link href="/assets">
                          <div className="flex items-center justify-between p-2 -mx-2 rounded-md hover-elevate cursor-pointer" data-testid="link-assets-overview">
                            <div className="flex items-center gap-3">
                              <PiggyBank className="h-5 w-5 text-muted-foreground" />
                              <span className="text-sm">Asset Value</span>
                            </div>
                            <span className="font-semibold" data-testid="stat-asset-value">{formatCurrency(summary.assets.totalValue)}</span>
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  </>
                )}

                <Card className="md:block">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {quickActions.map((action) => (
                        <Link key={action.href} href={action.href}>
                          <div 
                            className="flex flex-col items-center gap-2 p-4 rounded-md border hover-elevate active-elevate-2 cursor-pointer" 
                            data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <action.icon className={`h-5 w-5 ${action.color}`} />
                            </div>
                            <span className="text-sm font-medium text-center">{action.label}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {properties && properties.length > 0 ? (
              <div>
                <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                  <h2 className="text-xl font-semibold">Your Properties</h2>
                  <Link href="/properties">
                    <Button variant="ghost" size="sm" data-testid="link-view-all-properties">
                      View All Properties
                    </Button>
                  </Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {properties.slice(0, 8).map((property) => {
                    const Icon = propertyTypeIcons[property.propertyType] || Building2;
                    const unitCount = property.units?.length || 0;
                    const occupiedCount = property.units?.filter((u) => u.status === "OCCUPIED").length || 0;
                    const vacantCount = unitCount - occupiedCount;
                    
                    return (
                      <Link key={property.id} href={`/properties/${property.id}`}>
                        <Card 
                          className="hover-elevate active-elevate-2 cursor-pointer h-full"
                          data-testid={`property-card-${property.id}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start gap-3">
                              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-base truncate" data-testid={`text-property-name-${property.id}`}>
                                  {property.name}
                                </CardTitle>
                                <CardDescription className="truncate">
                                  {property.city}, {property.state}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {unitCount > 0 ? (
                              <div className="flex items-center gap-3 flex-wrap">
                                <Badge variant="secondary" className="gap-1">
                                  <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                                  {occupiedCount} Occupied
                                </Badge>
                                {vacantCount > 0 && (
                                  <Badge variant="outline" className="gap-1">
                                    {vacantCount} Vacant
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline">No units</Badge>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
                {properties.length > 8 && (
                  <div className="text-center mt-6">
                    <Link href="/properties">
                      <Button variant="outline" data-testid="button-view-more-properties">
                        View All {properties.length} Properties
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No properties yet"
                description="Get started by adding your first property. You can manage apartments, villas, plots, offices, and shops."
                actionLabel="Add Your First Property"
                actionHref="/properties/new"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
