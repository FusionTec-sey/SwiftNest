import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: React.ReactNode;
}

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/properties": "Properties",
  "/properties/new": "Add Property",
  "/properties/deleted": "Deleted Properties",
  "/tenants": "Tenants",
  "/owners": "Owners",
  "/leases": "Leases",
  "/rent-collection": "Rent Collection",
  "/accounting": "Accounting",
  "/expenses": "Expenses",
  "/utilities": "Utilities",
  "/loans": "Loans",
  "/assets": "Assets",
  "/reports": "Reports",
  "/settings": "Settings",
};

function getBreadcrumbs(location: string) {
  const parts = location.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];
  
  if (parts.length === 0) {
    return [{ label: "Dashboard", href: "/" }];
  }
  
  let currentPath = "";
  for (const part of parts) {
    currentPath += "/" + part;
    const title = routeTitles[currentPath];
    if (title) {
      breadcrumbs.push({ label: title, href: currentPath });
    } else if (part !== "new" && part !== "edit" && part !== "deleted" && part !== "maintenance") {
      const parentPath = "/" + parts[0];
      const parentTitle = routeTitles[parentPath];
      if (parentTitle && !breadcrumbs.find(b => b.label === parentTitle)) {
        breadcrumbs.push({ label: parentTitle, href: parentPath });
      }
      if (/^\d+$/.test(part)) {
        breadcrumbs.push({ label: `Details`, href: currentPath });
      }
    } else if (part === "edit") {
      breadcrumbs.push({ label: "Edit", href: currentPath });
    } else if (part === "maintenance") {
      breadcrumbs.push({ label: "Maintenance", href: currentPath });
    }
  }
  
  return breadcrumbs.length > 0 ? breadcrumbs : [{ label: "Dashboard", href: "/" }];
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const breadcrumbs = getBreadcrumbs(location);
  
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4" role="banner">
            <SidebarTrigger className="-ml-1" data-testid="button-sidebar-toggle" aria-label="Toggle sidebar navigation" />
            <Separator orientation="vertical" className="mr-2 h-4" aria-hidden="true" />
            <Breadcrumb aria-label="Page navigation">
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <BreadcrumbItem key={crumb.href}>
                    {index < breadcrumbs.length - 1 ? (
                      <>
                        <BreadcrumbLink 
                          href={crumb.href} 
                          data-testid={`breadcrumb-${crumb.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {crumb.label}
                        </BreadcrumbLink>
                        <BreadcrumbSeparator aria-hidden="true" />
                      </>
                    ) : (
                      <BreadcrumbPage 
                        data-testid={`breadcrumb-current-${crumb.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {crumb.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto" role="main" aria-label="Main content">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
