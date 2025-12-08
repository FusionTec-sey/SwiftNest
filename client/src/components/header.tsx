import { Link, useLocation } from "wouter";
import { Building2, Home, LogOut, User, Users, UserCircle, Calculator, FileText, Gauge, Landmark, Package, ChevronDown, BarChart3, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const mainNavItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/properties", label: "Properties", icon: Building2 },
    { href: "/tenants", label: "Tenants", icon: Users },
    { href: "/leases", label: "Leases", icon: FileText },
  ];

  const moreNavItems = [
    { href: "/rent-collection", label: "Rent Collection", icon: Receipt },
    { href: "/owners", label: "Owners", icon: UserCircle },
    { href: "/accounting", label: "Accounting", icon: Calculator },
    { href: "/utilities", label: "Utilities", icon: Gauge },
    { href: "/loans", label: "Loans", icon: Landmark },
    { href: "/assets", label: "Assets", icon: Package },
    { href: "/reports", label: "Reports", icon: BarChart3 },
  ];

  const allNavItems = [...mainNavItems, ...moreNavItems];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold" data-testid="text-logo">SwiftNest</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || 
                  (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-2"
                      data-testid={`link-${item.label.toLowerCase().replace(" ", "-")}`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={moreNavItems.some(item => location === item.href || (item.href !== "/" && location.startsWith(item.href))) ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-1"
                    data-testid="link-more"
                  >
                    More
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {moreNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="flex items-center gap-2 cursor-pointer" data-testid={`link-${item.label.toLowerCase().replace(" ", "-")}`}>
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 pl-2 pr-3" data-testid="button-user-menu">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline-block text-sm font-medium">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <Badge 
                        variant="secondary" 
                        className="w-fit mt-1 text-xs"
                        data-testid="badge-account-type"
                      >
                        {user.accountType === "ORGANIZATION" ? (
                          <Building2 className="h-3 w-3 mr-1" />
                        ) : (
                          <User className="h-3 w-3 mr-1" />
                        )}
                        {user.accountType}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logoutMutation.mutate()}
                    className="text-destructive focus:text-destructive cursor-pointer"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <nav className="md:hidden border-t overflow-x-auto">
        <div className="flex items-center py-2 px-2 gap-1 min-w-max">
          {allNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-col h-auto gap-1 px-3 py-2"
                  data-testid={`link-mobile-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
