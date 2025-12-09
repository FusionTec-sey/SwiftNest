import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Property } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Home, 
  Wrench, 
  ClipboardList, 
  FolderOpen, 
  CalendarDays, 
  Users, 
  FileText, 
  Receipt,
  Building2,
  MapPin,
  ArrowLeft,
  RefreshCw,
  SprayCan,
  LogIn,
  Clock,
  Thermometer,
  Shield
} from "lucide-react";

const usageTypeLabels: Record<string, { label: string; description: string }> = {
  LONG_TERM_RENTAL: { 
    label: "Long-term Rental", 
    description: "Traditional tenant and lease management"
  },
  SHORT_TERM_RENTAL: { 
    label: "Short-term Rental", 
    description: "Guest houses, holiday villas, vacation rentals"
  },
  OWNER_OCCUPIED: { 
    label: "Owner Occupied", 
    description: "Personal property maintenance and tracking"
  },
};

interface OperationCardProps {
  title: string;
  description: string;
  icon: typeof Home;
  href: string;
  isActive: boolean;
  comingSoon?: boolean;
}

function OperationCard({ title, description, icon: Icon, href, isActive, comingSoon }: OperationCardProps) {
  if (comingSoon) {
    return (
      <Card className="opacity-60">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Link href={href}>
      <Card className={`hover-elevate cursor-pointer ${isActive ? 'border-primary' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${isActive ? 'bg-primary/10' : 'bg-muted'}`}>
              <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

export default function PropertyOperationsPage() {
  const { id, operation } = useParams<{ id: string; operation?: string }>();
  const [location] = useLocation();
  const propertyId = parseInt(id || "0", 10);

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ["/api/properties", propertyId],
    enabled: propertyId > 0,
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 px-4 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container max-w-4xl py-8 px-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Property not found</p>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/properties">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Properties
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const usageInfo = usageTypeLabels[property.usageType || "LONG_TERM_RENTAL"];
  const basePath = `/properties/${propertyId}`;
  const currentPath = location.replace(basePath, "").replace(/^\//, "") || "overview";
  const isLongTermRental = property.usageType === "LONG_TERM_RENTAL" || !property.usageType;

  const operationsCards = [
    {
      title: "Overview",
      description: "Property details, units, and quick stats",
      icon: Home,
      href: `${basePath}/overview`,
      path: "overview",
    },
    {
      title: "Maintenance",
      description: "Issues, tasks, and scheduled maintenance",
      icon: Wrench,
      href: `${basePath}/maintenance`,
      path: "maintenance",
    },
    {
      title: "Tasks",
      description: "Staff tasks, assignments, and checklists",
      icon: ClipboardList,
      href: `${basePath}/tasks`,
      path: "tasks",
      comingSoon: true,
    },
    {
      title: "Documents",
      description: "Property documents and files",
      icon: FolderOpen,
      href: `${basePath}/documents`,
      path: "documents",
      comingSoon: true,
    },
    {
      title: "Calendar",
      description: "Events, bookings, and schedules",
      icon: CalendarDays,
      href: `${basePath}/calendar`,
      path: "calendar",
      comingSoon: true,
    },
  ];

  const tenantCards = [
    {
      title: "Tenants",
      description: "Manage property tenants",
      icon: Users,
      href: `${basePath}/tenants`,
      path: "tenants",
      comingSoon: true,
    },
    {
      title: "Leases",
      description: "Active and historical leases",
      icon: FileText,
      href: `${basePath}/leases`,
      path: "leases",
      comingSoon: true,
    },
    {
      title: "Rent Collection",
      description: "Invoices and payments",
      icon: Receipt,
      href: `${basePath}/rent`,
      path: "rent",
      comingSoon: true,
    },
  ];

  const shortTermCards = [
    {
      title: "Turnovers",
      description: "Guest check-in/out and room turnovers",
      icon: RefreshCw,
      href: `${basePath}/turnovers`,
      path: "turnovers",
      comingSoon: true,
    },
    {
      title: "Cleaning Checklists",
      description: "Cleaning tasks and quality control",
      icon: SprayCan,
      href: `${basePath}/cleaning`,
      path: "cleaning",
      comingSoon: true,
    },
    {
      title: "Quick Check-in",
      description: "Express guest arrival and departure",
      icon: LogIn,
      href: `${basePath}/check-in`,
      path: "check-in",
      comingSoon: true,
    },
  ];

  const ownerOccupiedCards = [
    {
      title: "Home Maintenance",
      description: "Scheduled maintenance and reminders",
      icon: Clock,
      href: `${basePath}/home-maintenance`,
      path: "home-maintenance",
      comingSoon: true,
    },
    {
      title: "Appliances & Warranties",
      description: "Track appliances, manuals, and warranty dates",
      icon: Thermometer,
      href: `${basePath}/appliances`,
      path: "appliances",
      comingSoon: true,
    },
    {
      title: "Insurance & Protection",
      description: "Home insurance and coverage tracking",
      icon: Shield,
      href: `${basePath}/insurance`,
      path: "insurance",
      comingSoon: true,
    },
  ];

  const isShortTermRental = property.usageType === "SHORT_TERM_RENTAL";
  const isOwnerOccupied = property.usageType === "OWNER_OCCUPIED";

  return (
    <div className="container max-w-4xl py-8 px-4 space-y-8">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold" data-testid="text-property-name">
              {property.name}
            </h1>
            <Badge variant="outline" data-testid="badge-usage-type">
              {usageInfo.label}
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {property.city}, {property.state || property.country}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {usageInfo.description}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/properties/${propertyId}`} data-testid="link-view-full-details">
            View Full Details
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Property Operations</h2>
        <div className="grid gap-3">
          {operationsCards.map((card) => (
            <OperationCard
              key={card.path}
              {...card}
              isActive={currentPath === card.path}
            />
          ))}
        </div>
      </div>

      {isLongTermRental && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Tenants & Leases</h2>
          <div className="grid gap-3">
            {tenantCards.map((card) => (
              <OperationCard
                key={card.path}
                {...card}
                isActive={currentPath === card.path}
              />
            ))}
          </div>
        </div>
      )}

      {isShortTermRental && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Guest Operations</h2>
          <div className="grid gap-3">
            {shortTermCards.map((card) => (
              <OperationCard
                key={card.path}
                {...card}
                isActive={currentPath === card.path}
              />
            ))}
          </div>
        </div>
      )}

      {isOwnerOccupied && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Home Management</h2>
          <div className="grid gap-3">
            {ownerOccupiedCards.map((card) => (
              <OperationCard
                key={card.path}
                {...card}
                isActive={currentPath === card.path}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
