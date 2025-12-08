import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Upload,
  Trash2,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lease, Property, Tenant, Document } from "@shared/schema";

const formatCurrency = (amount: string | number | null) => {
  if (!amount) return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
};

const formatDate = (date: string | Date | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle; color: string }> = {
    DRAFT: { variant: "secondary", icon: Clock, color: "text-muted-foreground" },
    ACTIVE: { variant: "default", icon: CheckCircle, color: "text-green-600" },
    EXPIRED: { variant: "outline", icon: XCircle, color: "text-orange-600" },
    TERMINATED: { variant: "destructive", icon: AlertTriangle, color: "text-red-600" },
  };

  const config = statusConfig[status] || statusConfig.DRAFT;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={`h-3 w-3 ${config.color}`} />
      {status}
    </Badge>
  );
};

const documentTypeLabels: Record<string, string> = {
  LEASE_AGREEMENT: "Lease Agreement",
  CONTRACT: "Contract",
  INVOICE: "Invoice",
  RECEIPT: "Receipt",
  OTHER: "Other Document",
};

export default function LeaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const leaseId = parseInt(id || "0");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDocType, setUploadDocType] = useState<string>("");
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);

  const { data: lease, isLoading: leaseLoading } = useQuery<Lease>({
    queryKey: ["/api/leases", leaseId],
    enabled: leaseId > 0,
  });

  const { data: property } = useQuery<Property>({
    queryKey: ["/api/properties", lease?.propertyId],
    enabled: !!lease?.propertyId,
  });

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/tenants", lease?.tenantId],
    enabled: !!lease?.tenantId,
  });

  const { data: documents, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents", "LEASE", leaseId],
    enabled: leaseId > 0,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", "LEASE", leaseId] });
      toast({
        title: "Document uploaded",
        description: "The document has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: number) => {
      await apiRequest("DELETE", `/api/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", "LEASE", leaseId] });
      setDeletingDoc(null);
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = (docType: string) => {
    setUploadDocType(docType);
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadDocType) {
      toast({
        title: "Upload error",
        description: "Please use the upload button to select document type.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("module", "LEASE");
    formData.append("moduleId", leaseId.toString());
    formData.append("documentType", uploadDocType);
    formData.append("title", file.name);

    uploadMutation.mutate(formData);
    e.target.value = "";
    setUploadDocType("");
  };

  if (leaseLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-32" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="p-6 space-y-6">
        <Link href="/leases">
          <Button variant="ghost" size="sm" data-testid="button-back-not-found">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leases
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Lease not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const leaseAgreements = documents?.filter(d => d.documentType === "LEASE_AGREEMENT") || [];
  const otherDocuments = documents?.filter(d => d.documentType !== "LEASE_AGREEMENT") || [];

  return (
    <div className="p-6 space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        data-testid="input-file-upload"
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className="flex items-center gap-4">
        <Link href="/leases">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-lease-title">
            Lease Agreement
          </h1>
          <p className="text-muted-foreground">
            {property?.name} - {tenant?.legalName}
          </p>
        </div>
        <div className="ml-auto">
          {getStatusBadge(lease.status)}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Property</p>
                <Link href={`/properties/${property?.id}`}>
                  <p className="font-medium text-primary hover:underline cursor-pointer" data-testid="link-property">
                    {property?.name || "Loading..."}
                  </p>
                </Link>
              </div>
              <div>
                <p className="text-muted-foreground">Address</p>
                <p className="font-medium" data-testid="text-property-address">
                  {property?.addressLine1 || "-"}
                </p>
              </div>
              {lease.unitId && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Unit</p>
                  <p className="font-medium" data-testid="text-unit-id">
                    Unit #{lease.unitId}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Tenant Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Tenant Name</p>
                <Link href={`/tenants/${tenant?.id}`}>
                  <p className="font-medium text-primary hover:underline cursor-pointer" data-testid="link-tenant">
                    {tenant?.legalName || "Loading..."}
                  </p>
                </Link>
              </div>
              <div>
                <p className="text-muted-foreground">Contact</p>
                <p className="font-medium" data-testid="text-tenant-email">
                  {tenant?.email || "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium" data-testid="text-tenant-phone">
                  {tenant?.phone || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Lease Duration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Start Date</p>
                <p className="font-medium" data-testid="text-start-date">
                  {formatDate(lease.startDate)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">End Date</p>
                <p className="font-medium" data-testid="text-end-date">
                  {formatDate(lease.endDate)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Frequency</p>
                <p className="font-medium" data-testid="text-frequency">
                  {lease.rentFrequency}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Due Day</p>
                <p className="font-medium" data-testid="text-due-day">
                  Day {lease.paymentDueDay}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Financial Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Rent Amount</p>
                <p className="font-medium text-lg" data-testid="text-rent-amount">
                  {formatCurrency(lease.rentAmount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Security Deposit</p>
                <p className="font-medium" data-testid="text-deposit-amount">
                  {formatCurrency(lease.depositAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {lease.terms && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Terms & Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap" data-testid="text-terms">
              {lease.terms}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Lease Agreements
              </CardTitle>
              <CardDescription>
                Signed tenancy agreements and contracts
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => handleUpload("LEASE_AGREEMENT")}
              disabled={uploadMutation.isPending}
              data-testid="button-upload-agreement"
            >
              <Upload className="h-4 w-4" />
              Upload Agreement
            </Button>
          </CardHeader>
          <CardContent>
            {docsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : leaseAgreements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No lease agreements uploaded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {leaseAgreements.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    data-testid={`doc-agreement-${doc.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(doc.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <a href={`/api/documents/${doc.id}/download`} download data-testid={`link-download-agreement-${doc.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-download-${doc.id}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingDoc(doc)}
                        data-testid={`button-delete-doc-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Other Documents
              </CardTitle>
              <CardDescription>
                Addendums, receipts, and related documents
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => handleUpload("OTHER")}
              disabled={uploadMutation.isPending}
              data-testid="button-upload-other"
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </CardHeader>
          <CardContent>
            {docsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
              </div>
            ) : otherDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No other documents uploaded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {otherDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    data-testid={`doc-other-${doc.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {documentTypeLabels[doc.documentType] || doc.documentType} - {formatDate(doc.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <a href={`/api/documents/${doc.id}/download`} download data-testid={`link-download-other-${doc.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-download-${doc.id}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingDoc(doc)}
                        data-testid={`button-delete-doc-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingDoc} onOpenChange={() => setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingDoc?.originalName}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingDoc && deleteDocMutation.mutate(deletingDoc.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
