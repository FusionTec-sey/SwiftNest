import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AppLayout } from "@/components/app-layout";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import PropertiesPage from "@/pages/properties-page";
import PropertyNewPage from "@/pages/property-new-page";
import PropertyEditPage from "@/pages/property-edit-page";
import PropertyDetailPage from "@/pages/property-detail-page";
import DeletedPropertiesPage from "@/pages/deleted-properties-page";
import MaintenancePage from "@/pages/maintenance-page";
import TenantsPage from "@/pages/tenants-page";
import TenantDetailPage from "@/pages/tenant-detail-page";
import OwnersPage from "@/pages/owners-page";
import AccountingPage from "@/pages/accounting-page";
import LeasesPage from "@/pages/leases-page";
import LeaseDetailPage from "@/pages/lease-detail-page";
import UtilitiesPage from "@/pages/utilities-page";
import LoansPage from "@/pages/loans-page";
import AssetsPage from "@/pages/assets-page";
import ReportsPage from "@/pages/reports-page";
import InvitePage from "@/pages/invite-page";
import RentCollectionPage from "@/pages/rent-collection-page";
import SettingsPage from "@/pages/settings-page";
import CompliancePage from "@/pages/compliance-page";
import ExpensesPage from "@/pages/expenses-page";
import AdminPage from "@/pages/admin-page";

function ProtectedRoutes() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/properties" component={PropertiesPage} />
      <Route path="/properties/deleted" component={DeletedPropertiesPage} />
      <Route path="/properties/new" component={PropertyNewPage} />
      <Route path="/properties/:id/edit" component={PropertyEditPage} />
      <Route path="/properties/:id/maintenance" component={MaintenancePage} />
      <Route path="/properties/:id" component={PropertyDetailPage} />
      <Route path="/tenants" component={TenantsPage} />
      <Route path="/tenants/:id" component={TenantDetailPage} />
      <Route path="/owners" component={OwnersPage} />
      <Route path="/leases" component={LeasesPage} />
      <Route path="/leases/:id" component={LeaseDetailPage} />
      <Route path="/rent-collection" component={RentCollectionPage} />
      <Route path="/accounting" component={AccountingPage} />
      <Route path="/utilities" component={UtilitiesPage} />
      <Route path="/loans" component={LoansPage} />
      <Route path="/assets" component={AssetsPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/expenses" component={ExpensesPage} />
      <Route path="/compliance" component={CompliancePage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  const isPublicRoute = location === "/auth" || location.startsWith("/invite/");
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (isPublicRoute) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/invite/:token" component={InvitePage} />
      </Switch>
    );
  }
  
  if (!user) {
    window.location.href = "/auth";
    return null;
  }
  
  return (
    <AppLayout>
      <ProtectedRoutes />
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppContent />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
