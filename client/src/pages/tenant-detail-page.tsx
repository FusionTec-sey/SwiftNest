import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  FileText,
  Upload,
  Trash2,
  Download,
  Calendar,
  Globe,
  CreditCard,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Tenant, Document } from "@shared/schema";

const kycFormSchema = z.object({
  passportNumber: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
  workPermitNumber: z.string().optional(),
  workPermitExpiry: z.string().optional(),
  verificationStatus: z.enum(["PENDING", "IN_PROGRESS", "VERIFIED", "REJECTED"]),
  kycNotes: z.string().optional(),
});

type KycFormData = z.infer<typeof kycFormSchema>;

const formatDate = (date: string | Date | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
};

const getVerificationStatusIcon = (status: string) => {
  switch (status) {
    case "VERIFIED":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "IN_PROGRESS":
      return <Clock className="h-4 w-4 text-blue-600" />;
    case "REJECTED":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  }
};

const getVerificationStatusVariant = (status: string) => {
  switch (status) {
    case "VERIFIED":
      return "default" as const;
    case "IN_PROGRESS":
      return "secondary" as const;
    case "REJECTED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
};

const documentTypeLabels: Record<string, string> = {
  ID_DOCUMENT: "ID Document",
  LEASE_AGREEMENT: "Lease Agreement",
  CONTRACT: "Contract",
  OTHER: "Other Document",
};

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tenantId = parseInt(id || "0");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditingKyc, setIsEditingKyc] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);

  const { data: tenant, isLoading: tenantLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenants", tenantId],
    enabled: !isNaN(tenantId) && tenantId > 0,
  });

  const { data: documents, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents", "TENANT", tenantId],
    enabled: !isNaN(tenantId) && tenantId > 0,
  });

  const form = useForm<KycFormData>({
    resolver: zodResolver(kycFormSchema),
    defaultValues: {
      passportNumber: "",
      nationality: "",
      dateOfBirth: "",
      workPermitNumber: "",
      workPermitExpiry: "",
      verificationStatus: "PENDING",
      kycNotes: "",
    },
  });

  const updateKycMutation = useMutation({
    mutationFn: async (data: KycFormData) => {
      const payload = {
        ...data,
        dateOfBirth: data.dateOfBirth || null,
        workPermitExpiry: data.workPermitExpiry || null,
      };
      return apiRequest("PUT", `/api/tenants/${tenantId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setIsEditingKyc(false);
      toast({
        title: "KYC updated",
        description: "Tenant verification information has been saved.",
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

  const uploadDocMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      formData.append("documentType", documentType);
      formData.append("module", "TENANT");
      formData.append("moduleId", tenantId.toString());

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", "TENANT", tenantId] });
      setUploadingType(null);
      toast({
        title: "Document uploaded",
        description: "The document has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      setUploadingType(null);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: number) => {
      return apiRequest("DELETE", `/api/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", "TENANT", tenantId] });
      setDeletingDoc(null);
      toast({
        title: "Document deleted",
        description: "The document has been removed.",
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

  const startEditKyc = () => {
    if (tenant) {
      form.reset({
        passportNumber: tenant.passportNumber || "",
        nationality: tenant.nationality || "",
        dateOfBirth: tenant.dateOfBirth ? new Date(tenant.dateOfBirth).toISOString().split("T")[0] : "",
        workPermitNumber: tenant.workPermitNumber || "",
        workPermitExpiry: tenant.workPermitExpiry ? new Date(tenant.workPermitExpiry).toISOString().split("T")[0] : "",
        verificationStatus: (tenant.verificationStatus as any) || "PENDING",
        kycNotes: tenant.kycNotes || "",
      });
      setIsEditingKyc(true);
    }
  };

  const handleFileUpload = (documentType: string) => {
    setUploadingType(documentType);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingType) {
      uploadDocMutation.mutate({ file, documentType: uploadingType });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (tenantLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="space-y-6">
        <Link href="/tenants">
          <Button variant="ghost" size="sm" data-testid="button-back-not-found">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tenants
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Tenant not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const idDocuments = documents?.filter(d => d.documentType === "ID_DOCUMENT") || [];
  const otherDocuments = documents?.filter(d => d.documentType !== "ID_DOCUMENT") || [];

  return (
    <div className="space-y-6">
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
        <Link href="/tenants">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-tenant-name">
            {tenant.legalName}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Badge variant="secondary">
              {tenant.tenantType === "INDIVIDUAL" ? "Individual" : "Company"}
            </Badge>
            <Badge variant={getVerificationStatusVariant(tenant.verificationStatus || "PENDING")}>
              {getVerificationStatusIcon(tenant.verificationStatus || "PENDING")}
              <span className="ml-1">{tenant.verificationStatus || "PENDING"}</span>
            </Badge>
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenant.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{tenant.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{tenant.phone}</span>
            </div>
            {(tenant.addressLine1 || tenant.city || tenant.country) && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  {tenant.addressLine1 && <div>{tenant.addressLine1}</div>}
                  {tenant.addressLine2 && <div>{tenant.addressLine2}</div>}
                  {(tenant.city || tenant.country) && (
                    <div>{[tenant.city, tenant.country].filter(Boolean).join(", ")}</div>
                  )}
                </div>
              </div>
            )}
            {tenant.emergencyContactName && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Emergency Contact</p>
                <p className="text-sm font-medium">{tenant.emergencyContactName}</p>
                {tenant.emergencyContactPhone && (
                  <p className="text-sm text-muted-foreground">{tenant.emergencyContactPhone}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                KYC Verification
              </CardTitle>
              <CardDescription>
                Identity verification and document collection
              </CardDescription>
            </div>
            {!isEditingKyc ? (
              <Button variant="outline" size="sm" onClick={startEditKyc} data-testid="button-edit-kyc">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingKyc(false)}
                  data-testid="button-cancel-kyc"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={form.handleSubmit((data) => updateKycMutation.mutate(data))}
                  disabled={updateKycMutation.isPending}
                  data-testid="button-save-kyc"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isEditingKyc ? (
              <Form {...form}>
                <form className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="passportNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passport / ID Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., N0177974" data-testid="input-passport" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nationality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nationality</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Seychelles" data-testid="input-nationality" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-dob" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workPermitNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Permit / GOP Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="If applicable" data-testid="input-work-permit" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workPermitExpiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Permit Expiry</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-permit-expiry" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="verificationStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-verification-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PENDING" data-testid="select-status-pending">Pending</SelectItem>
                              <SelectItem value="IN_PROGRESS" data-testid="select-status-in-progress">In Progress</SelectItem>
                              <SelectItem value="VERIFIED" data-testid="select-status-verified">Verified</SelectItem>
                              <SelectItem value="REJECTED" data-testid="select-status-rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="kycNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KYC Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Add any notes about the verification process..."
                            data-testid="input-kyc-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Passport / ID Number</p>
                  <p className="text-sm font-medium" data-testid="text-passport">
                    {tenant.passportNumber || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nationality</p>
                  <p className="text-sm font-medium" data-testid="text-nationality">
                    {tenant.nationality || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="text-sm font-medium" data-testid="text-dob">
                    {formatDate(tenant.dateOfBirth)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Work Permit / GOP</p>
                  <p className="text-sm font-medium" data-testid="text-work-permit">
                    {tenant.workPermitNumber || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Work Permit Expiry</p>
                  <p className="text-sm font-medium" data-testid="text-permit-expiry">
                    {formatDate(tenant.workPermitExpiry)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">KYC Completed</p>
                  <p className="text-sm font-medium" data-testid="text-kyc-completed">
                    {formatDate(tenant.kycCompletedAt)}
                  </p>
                </div>
                {tenant.kycNotes && (
                  <div className="sm:col-span-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm" data-testid="text-kyc-notes">{tenant.kycNotes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" />
                Identity Documents
              </CardTitle>
              <CardDescription>
                Passport, ID cards, work permits, GOP documents
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFileUpload("ID_DOCUMENT")}
              disabled={uploadDocMutation.isPending && uploadingType === "ID_DOCUMENT"}
              data-testid="button-upload-id"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </CardHeader>
          <CardContent>
            {docsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : idDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No identity documents uploaded yet</p>
                <p className="text-xs">Upload passport, ID card, or work permit</p>
              </div>
            ) : (
              <div className="space-y-2">
                {idDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                    data-testid={`doc-id-${doc.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(doc.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <a href={`/api/documents/${doc.id}/download`} download data-testid={`link-download-id-${doc.id}`}>
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
                <FileCheck className="h-5 w-5" />
                Agreements & Other Documents
              </CardTitle>
              <CardDescription>
                Signed tenancy agreements and other records
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFileUpload("LEASE_AGREEMENT")}
              disabled={uploadDocMutation.isPending && uploadingType === "LEASE_AGREEMENT"}
              data-testid="button-upload-agreement"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </CardHeader>
          <CardContent>
            {docsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : otherDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No agreements uploaded yet</p>
                <p className="text-xs">Upload signed tenancy agreements</p>
              </div>
            ) : (
              <div className="space-y-2">
                {otherDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                    data-testid={`doc-other-${doc.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
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
              Are you sure you want to delete "{deletingDoc?.originalName}"? This action cannot be undone.
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
