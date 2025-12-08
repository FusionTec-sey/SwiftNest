import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, Home, Plus, Users, TrendingUp, Store, MapPin, Building, AlertTriangle, Calendar, DollarSign, FileText, Wrench, CreditCard, ArrowRight, Clock, CheckCircle, UserPlus, Receipt, PiggyBank } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PropertyCard } from "@/components/property-card";
import { StatsCard } from "@/components/stats-card";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property, Unit } from "@shared/schema";

type PropertyWithUnits = Property & { units: Unit[] };

interface DashboardSummary {
  properties: { total: number; occupied: number; vacant: number };
  tenants: { total: number; active: number };
  leases: { active: number; expiringSoon: number };
  financials: { monthlyRentDue: number; overdueAmount: number; receivedThisMonth: number };
  loans: { total: number; totalOutstanding: number };
  assets: { total: number; totalValue: number };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: properties, isLoading } = useQuery<PropertyWithUnits[]>({
    queryKey: ["/api/properties"],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/reports/dashboard-summary"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Property deleted",
        description: "The property has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const totalProperties = properties?.length || 0;
  const totalUnits = properties?.reduce((acc, p) => acc + (p.units?.length || 0), 0) || 0;
  const vacantUnits = properties?.reduce(
    (acc, p) => acc + (p.units?.filter((u) => u.status === "VACANT").length || 0),
    0
  ) || 0;
  const occupiedUnits = totalUnits - vacantUnits;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const propertyTypeBreakdown = properties?.reduce((acc, p) => {
    acc[p.propertyType] = (acc[p.propertyType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const propertyTypeLabels: Record<string, { label: string; icon: typeof Building2 }> = {
    APARTMENT: { label: "Apartments", icon: Building },
    VILLA: { label: "Villas", icon: Home },
    PLOT: { label: "Plots", icon: MapPin },
    OFFICE: { label: "Offices", icon: Building2 },
    SHOP: { label: "Shops", icon: Store },
  };

  const hasAlerts = summary && (summary.financials.overdueAmount > 0 || summary.leases.expiringSoon > 0);

  const quickActions = [
    { label: "Add Property", href: "/properties/new", icon: Plus, color: "text-blue-600 dark:text-blue-400" },
    { label: "Add Tenant", href: "/tenants/new", icon: UserPlus, color: "text-green-600 dark:text-green-400" },
    { label: "Record Payment", href: "/rent-collection", icon: Receipt, color: "text-purple-600 dark:text-purple-400" },
    { label: "View Reports", href: "/reports", icon: FileText, color: "text-orange-600 dark:text-orange-400" },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-welcome">
              Welcome back, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your property portfolio
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.slice(0, 2).map((action) => (
              <Link key={action.href} href={action.href}>
                <Button variant="outline" className="gap-2" data-testid={`button-quick-${action.label.toLowerCase().replace(" ", "-")}`}>
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                  {action.label}
                </Button>
              </Link>
            ))}
            <Link href="/properties/new">
              <Button className="gap-2" data-testid="button-add-property">
                <Plus className="h-4 w-4" />
                Add Property
              </Button>
            </Link>
          </div>
        </div>

        {(isLoading || summaryLoading) ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
            <Skeleton className="h-32" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-72" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {hasAlerts && (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    Attention Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {summary!.financials.overdueAmount > 0 && (
                      <Link href="/rent-collection">
                        <div className="flex items-center gap-4 p-3 rounded-md bg-white dark:bg-background border hover-elevate active-elevate-2 cursor-pointer" data-testid="alert-overdue-rent">
                          <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                            <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">Overdue Rent</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(summary!.financials.overdueAmount)} unpaid
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </Link>
                    )}
                    {summary!.leases.expiringSoon > 0 && (
                      <Link href="/leases">
                        <div className="flex items-center gap-4 p-3 rounded-md bg-white dark:bg-background border hover-elevate active-elevate-2 cursor-pointer" data-testid="alert-expiring-leases">
                          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                            <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">Expiring Leases</p>
                            <p className="text-sm text-muted-foreground">
                              {summary!.leases.expiringSoon} {summary!.leases.expiringSoon === 1 ? "lease expires" : "leases expire"} within 30 days
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Total Properties"
                value={totalProperties}
                icon={Building2}
              />
              <StatsCard
                title="Total Units"
                value={totalUnits}
                icon={Home}
              />
              <StatsCard
                title="Vacant Units"
                value={vacantUnits}
                icon={Users}
                className="bg-amber-50 dark:bg-amber-950/20"
              />
              <StatsCard
                title="Occupied Units"
                value={occupiedUnits}
                icon={CheckCircle}
                className="bg-green-50 dark:bg-green-950/20"
              />
            </div>

            {summary && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Monthly Rent Due
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="stat-monthly-rent-due">
                      {formatCurrency(summary.financials.monthlyRentDue)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Received This Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="stat-received-this-month">
                      {formatCurrency(summary.financials.receivedThisMonth)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Outstanding Loans
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="stat-outstanding-loans">
                      {formatCurrency(summary.loans.totalOutstanding)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.loans.total} active {summary.loans.total === 1 ? "loan" : "loans"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <PiggyBank className="h-4 w-4" />
                      Asset Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="stat-asset-value">
                      {formatCurrency(summary.assets.totalValue)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.assets.total} {summary.assets.total === 1 ? "asset" : "assets"} tracked
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="md:hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <Link key={action.href} href={action.href}>
                      <div className="flex flex-col items-center gap-2 p-4 rounded-md border hover-elevate active-elevate-2 cursor-pointer" data-testid={`quick-action-${action.label.toLowerCase().replace(" ", "-")}`}>
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

            {totalUnits > 0 && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Occupancy Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-end justify-between gap-2 flex-wrap">
                        <span className="text-4xl font-bold" data-testid="stat-occupancy-rate">{occupancyRate}%</span>
                        <span className="text-sm text-muted-foreground">
                          {occupiedUnits} of {totalUnits} units occupied
                        </span>
                      </div>
                      <Progress value={occupancyRate} className="h-3" />
                      <div className="flex justify-between text-xs text-muted-foreground flex-wrap gap-2">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          {vacantUnits} Vacant
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          {occupiedUnits} Occupied
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Properties by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(propertyTypeBreakdown).length > 0 ? (
                        Object.entries(propertyTypeBreakdown).map(([type, count]) => {
                          const typeInfo = propertyTypeLabels[type];
                          const TypeIcon = typeInfo?.icon || Building2;
                          const percentage = Math.round((count / totalProperties) * 100);
                          return (
                            <div key={type} className="flex items-center gap-3" data-testid={`breakdown-${type.toLowerCase()}`}>
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium truncate">{typeInfo?.label || type}</span>
                                  <span className="text-sm text-muted-foreground shrink-0">{count}</span>
                                </div>
                                <Progress value={percentage} className="h-1.5 mt-1" />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground">No properties to display</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {summary && (
              <div className="grid sm:grid-cols-3 gap-4">
                <Link href="/tenants">
                  <Card className="hover-elevate cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Tenants
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold" data-testid="stat-active-tenants">{summary.tenants.active}</span>
                        <span className="text-muted-foreground">active</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {summary.tenants.total} total tenants
                      </p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/leases">
                  <Card className="hover-elevate cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Leases
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold" data-testid="stat-active-leases">{summary.leases.active}</span>
                        <span className="text-muted-foreground">active</span>
                      </div>
                      {summary.leases.expiringSoon > 0 && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                          {summary.leases.expiringSoon} expiring soon
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/accounting">
                  <Card className="hover-elevate cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Financials
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="stat-collection-rate">
                          {summary.financials.monthlyRentDue > 0 
                            ? Math.round((summary.financials.receivedThisMonth / summary.financials.monthlyRentDue) * 100)
                            : 0}%
                        </span>
                        <span className="text-muted-foreground">collected</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        this month
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            )}

            {properties && properties.length > 0 ? (
              <div>
                <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                  <h2 className="text-xl font-semibold">Your Properties</h2>
                  <Link href="/properties">
                    <Button variant="ghost" size="sm" data-testid="link-view-all">
                      View All
                    </Button>
                  </Link>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {properties.slice(0, 6).map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      isDeleting={deleteMutation.isPending}
                    />
                  ))}
                </div>
                {properties.length > 6 && (
                  <div className="text-center mt-8">
                    <Link href="/properties">
                      <Button variant="outline" data-testid="button-view-more">
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
