import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import PropertiesPage from "@/pages/properties-page";
import PropertyNewPage from "@/pages/property-new-page";
import PropertyEditPage from "@/pages/property-edit-page";
import PropertyDetailPage from "@/pages/property-detail-page";
import DeletedPropertiesPage from "@/pages/deleted-properties-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/properties" component={PropertiesPage} />
      <ProtectedRoute path="/properties/deleted" component={DeletedPropertiesPage} />
      <ProtectedRoute path="/properties/new" component={PropertyNewPage} />
      <ProtectedRoute path="/properties/:id/edit" component={PropertyEditPage} />
      <ProtectedRoute path="/properties/:id" component={PropertyDetailPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
