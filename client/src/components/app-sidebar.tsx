import { Link, useLocation } from "wouter";
import {
  Building2,
  Home,
  Users,
  FileText,
  Receipt,
  UserCircle,
  Calculator,
  Gauge,
  Package,
  Boxes,
  BarChart3,
  Settings,
  LogOut,
  Trash2,
  FileCheck,
  ShieldCheck,
  Wallet,
  ArrowLeftRight,
  Wrench,
  ClipboardList,
  CalendarDays,
  FolderOpen,
  Briefcase,
  RefreshCw,
  SprayCan,
  LogIn,
  Refrigerator,
  Clock,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useActiveProperty } from "@/contexts/active-property-context";
import { PropertySelector } from "@/components/property-selector";
import { Badge } from "@/components/ui/badge";

const propertyOperationsNavItems = [
  { href: "overview", label: "Overview", icon: Home },
  { href: "maintenance", label: "Maintenance", icon: Wrench },
  { href: "tasks", label: "Tasks", icon: ClipboardList },
  { href: "documents", label: "Documents", icon: FolderOpen },
  { href: "calendar", label: "Calendar", icon: CalendarDays },
];

const shortTermRentalNavItems = [
  { href: "turnovers", label: "Turnovers", icon: RefreshCw },
  { href: "cleaning", label: "Cleaning Checklists", icon: SprayCan },
  { href: "guest-checkin", label: "Guest Check-in", icon: LogIn },
];

const ownerOccupiedNavItems = [
  { href: "home-maintenance", label: "Home Maintenance", icon: Clock },
  { href: "appliances", label: "Appliances", icon: Refrigerator },
];

const portfolioNavItems = [
  { href: "/properties", label: "All Properties", icon: Building2 },
  { href: "/tenants", label: "Tenants", icon: Users },
  { href: "/leases", label: "Leases", icon: FileText },
  { href: "/rent-collection", label: "Rent Collection", icon: Receipt },
  { href: "/owners", label: "Owners", icon: UserCircle },
  { href: "/accounting", label: "Accounting", icon: Calculator },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/assets", label: "Assets", icon: Package },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const systemNavItems = [
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/compliance", label: "Compliance", icon: FileCheck },
  { href: "/utilities", label: "Utilities", icon: Gauge },
  { href: "/exchange-rates", label: "Exchange Rates", icon: ArrowLeftRight, adminOnly: true },
];

const usageTypeLabels: Record<string, string> = {
  LONG_TERM_RENTAL: "Long-term Rental",
  SHORT_TERM_RENTAL: "Short-term Rental",
  OWNER_OCCUPIED: "Owner Occupied",
};

export function AppSidebar() {
  const { user, logoutMutation } = useAuth();
  const { activeProperty, activePropertyId } = useActiveProperty();
  const [location] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  // Close sidebar on mobile when navigating
  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location === href || location.startsWith(href + "/");
  };

  const isPropertyActive = (path: string) => {
    if (!activePropertyId) return false;
    const fullPath = `/properties/${activePropertyId}/${path}`;
    return location === fullPath || location.startsWith(fullPath + "/");
  };

  const renderNavItem = (item: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }) => {
    const Icon = item.icon;
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          asChild
          isActive={isActive(item.href)}
          tooltip={item.label}
        >
          <Link 
            href={item.href} 
            onClick={closeMobileSidebar}
            data-testid={`sidebar-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderPropertyNavItem = (item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    if (!activePropertyId) return null;
    const Icon = item.icon;
    const fullHref = `/properties/${activePropertyId}/${item.href}`;
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          asChild
          isActive={isPropertyActive(item.href)}
          tooltip={item.label}
        >
          <Link 
            href={fullHref} 
            onClick={closeMobileSidebar}
            data-testid={`sidebar-link-property-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" aria-label="Main navigation">
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="SwiftNest">
              <Link href="/" onClick={closeMobileSidebar} data-testid="sidebar-logo" aria-label="SwiftNest Home">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary" aria-hidden="true">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-semibold">SwiftNest</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Active Property</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <PropertySelector />
            {activeProperty?.usageType && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {usageTypeLabels[activeProperty.usageType] || activeProperty.usageType}
                </Badge>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {activePropertyId && (
          <>
            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel>Property Operations</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {propertyOperationsNavItems.map(renderPropertyNavItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {activeProperty?.usageType === "SHORT_TERM_RENTAL" && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupLabel>Short-term Rental</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {shortTermRentalNavItems.map(renderPropertyNavItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {activeProperty?.usageType === "OWNER_OCCUPIED" && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupLabel>Home Management</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {ownerOccupiedNavItems.map(renderPropertyNavItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

          </>
        )}

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Portfolio</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {portfolioNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems
                .filter(item => !item.adminOnly || user?.isSuperAdmin === 1)
                .map(renderNavItem)}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/properties/deleted")}
                  tooltip="Deleted Properties"
                >
                  <Link 
                    href="/properties/deleted" 
                    onClick={closeMobileSidebar}
                    data-testid="sidebar-link-deleted-properties"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span>Deleted Properties</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/settings")}
                  tooltip="Settings"
                >
                  <Link 
                    href="/settings" 
                    onClick={closeMobileSidebar}
                    data-testid="sidebar-link-settings"
                  >
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {user?.isSuperAdmin === 1 && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/admin")}
                    tooltip="Admin"
                  >
                    <Link 
                      href="/admin" 
                      onClick={closeMobileSidebar}
                      data-testid="sidebar-link-admin"
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={user?.name || "User"}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user?.name ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium truncate max-w-[140px]">{user?.name}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[140px]">{user?.email}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => logoutMutation.mutate()}
              tooltip="Logout"
              className="text-destructive hover:text-destructive"
              data-testid="sidebar-button-logout"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
