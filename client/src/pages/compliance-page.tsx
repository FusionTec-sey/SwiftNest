import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  FileCheck, 
  Plus, 
  Trash2, 
  Calendar, 
  AlertTriangle, 
  Search,
  Building2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EmptyState } from "@/components/empty-state";
import type { Owner, Property, ComplianceDocumentWithStatus } from "@shared/schema";

const documentTypes = [
  { value: "LICENSE", label: "License" },
  { value: "PERMIT", label: "Permit" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "REGISTRATION", label: "Registration" },
  { value: "TAX_DOCUMENT", label: "Tax Document" },
  { value: "LEGAL_AGREEMENT", label: "Legal Agreement" },
  { value: "WARRANTY", label: "Warranty" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "OTHER", label: "Other" },
] as const;

const complianceFormSchema = z.object({
  entityType: z.enum(["OWNER", "PROPERTY"]),
  entityId: z.number().min(1, "Please select an entity"),
  documentType: z.enum(["LICENSE", "PERMIT", "CERTIFICATE", "INSURANCE", "REGISTRATION", "TAX_DOCUMENT", "LEGAL_AGREEMENT", "WARRANTY", "INSPECTION", "OTHER"]),
  documentName: z.string().min(1, "Document name is required"),
  documentNumber: z.string().optional(),
  issuingAuthority: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  reminderDays: z.number().min(1).max(365).default(30),
  notes: z.string().optional(),
});

type ComplianceFormData = z.infer<typeof complianceFormSchema>;

const formatDate = (date: string | Date | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "EXPIRING_SOON":
      return "secondary";
    case "EXPIRED":
      return "destructive";
    default:
      return "outline";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "EXPIRING_SOON":
      return "Expiring Soon";
    case "EXPIRED":
      return "Expired";
    default:
      return "No Expiry";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return <CheckCircle className="h-4 w-4" aria-hidden="true" />;
    case "EXPIRING_SOON":
      return <Clock className="h-4 w-4" aria-hidden="true" />;
    case "EXPIRED":
      return <XCircle className="h-4 w-4" aria-hidden="true" />;
    default:
      return null;
  }
};

export default function CompliancePage() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ComplianceDocumentWithStatus | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<ComplianceDocumentWithStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: documents, isLoading } = useQuery<ComplianceDocumentWithStatus[]>({
    queryKey: ["/api/compliance-documents"],
  });

  const { data: expiringDocs } = useQuery<ComplianceDocumentWithStatus[]>({
    queryKey: ["/api/compliance-documents/expiring"],
  });

  const { data: owners } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm<ComplianceFormData>({
    resolver: zodResolver(complianceFormSchema),
    defaultValues: {
      entityType: "OWNER",
      entityId: 0,
      documentType: "LICENSE",
      documentName: "",
      documentNumber: "",
      issuingAuthority: "",
      issueDate: "",
      expiryDate: "",
      reminderDays: 30,
      notes: "",
    },
  });

  const watchEntityType = form.watch("entityType");

  const createMutation = useMutation({
    mutationFn: async (data: ComplianceFormData) => {
      if (editingDoc) {
        return apiRequest("PATCH", `/api/compliance-documents/${editingDoc.id}`, data);
      }
      return apiRequest("POST", "/api/compliance-documents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-documents"] });
      setIsFormOpen(false);
      setEditingDoc(null);
      form.reset();
      toast({
        title: editingDoc ? "Document updated" : "Document added",
        description: editingDoc
          ? "The compliance document has been updated successfully."
          : "A new compliance document has been added.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save the document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/compliance-documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-documents"] });
      setDeletingDoc(null);
      toast({
        title: "Document deleted",
        description: "The compliance document has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the document.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (doc: ComplianceDocumentWithStatus) => {
    setEditingDoc(doc);
    form.reset({
      entityType: doc.entityType as "OWNER" | "PROPERTY",
      entityId: doc.entityId,
      documentType: doc.documentType as any,
      documentName: doc.documentName,
      documentNumber: doc.documentNumber || "",
      issuingAuthority: doc.issuingAuthority || "",
      issueDate: doc.issueDate ? new Date(doc.issueDate).toISOString().split("T")[0] : "",
      expiryDate: doc.expiryDate ? new Date(doc.expiryDate).toISOString().split("T")[0] : "",
      reminderDays: doc.reminderDays || 30,
      notes: doc.notes || "",
    });
    setIsFormOpen(true);
  };

  const handleNewDocument = () => {
    setEditingDoc(null);
    form.reset({
      entityType: "OWNER",
      entityId: 0,
      documentType: "LICENSE",
      documentName: "",
      documentNumber: "",
      issuingAuthority: "",
      issueDate: "",
      expiryDate: "",
      reminderDays: 30,
      notes: "",
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: ComplianceFormData) => {
    createMutation.mutate(data);
  };

  const filteredDocuments = (documents || []).filter((doc) => {
    const matchesSearch =
      doc.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.documentNumber?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.entityName?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "expiring") return matchesSearch && (doc.computedStatus === "EXPIRING_SOON" || doc.computedStatus === "EXPIRED");
    if (activeTab === "owners") return matchesSearch && doc.entityType === "OWNER";
    if (activeTab === "properties") return matchesSearch && doc.entityType === "PROPERTY";
    
    return matchesSearch;
  });

  const stats = {
    total: documents?.length || 0,
    active: documents?.filter((d) => d.computedStatus === "ACTIVE").length || 0,
    expiringSoon: documents?.filter((d) => d.computedStatus === "EXPIRING_SOON").length || 0,
    expired: documents?.filter((d) => d.computedStatus === "EXPIRED").length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Compliance Center</h1>
          <p className="text-muted-foreground">
            Track licenses, permits, insurance, and other compliance documents
          </p>
        </div>
        <Button onClick={handleNewDocument} data-testid="button-add-compliance-doc">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add Document
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-docs">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-active-docs">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-expiring-docs">{stats.expiringSoon}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-expired-docs">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {(stats.expiringSoon > 0 || stats.expired > 0) && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 dark:text-yellow-300">
              You have {stats.expired > 0 ? `${stats.expired} expired` : ""}
              {stats.expired > 0 && stats.expiringSoon > 0 ? " and " : ""}
              {stats.expiringSoon > 0 ? `${stats.expiringSoon} expiring soon` : ""} document
              {stats.expired + stats.expiringSoon > 1 ? "s" : ""} that require attention.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-docs"
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="expiring" data-testid="tab-expiring">
              Needs Attention
              {(stats.expiringSoon + stats.expired) > 0 && (
                <Badge variant="destructive" className="ml-2">{stats.expiringSoon + stats.expired}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="owners" data-testid="tab-owners">Owners</TabsTrigger>
            <TabsTrigger value="properties" data-testid="tab-properties">Properties</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title={searchQuery ? "No documents found" : "No compliance documents yet"}
          description={
            searchQuery
              ? "Try adjusting your search query."
              : "Add licenses, permits, insurance, and other compliance documents to track their expiry dates."
          }
          onAction={!searchQuery ? handleNewDocument : undefined}
          actionLabel={!searchQuery ? "Add Document" : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} data-testid={`card-compliance-doc-${doc.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{doc.documentName}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      {doc.entityType === "OWNER" ? (
                        <Users className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <Building2 className="h-3 w-3" aria-hidden="true" />
                      )}
                      {doc.entityName}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(doc.computedStatus)}>
                    {getStatusIcon(doc.computedStatus)}
                    <span className="ml-1">{getStatusLabel(doc.computedStatus)}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium">{documentTypes.find(t => t.value === doc.documentType)?.label || doc.documentType}</p>
                  </div>
                  {doc.documentNumber && (
                    <div>
                      <span className="text-muted-foreground">Number:</span>
                      <p className="font-medium">{doc.documentNumber}</p>
                    </div>
                  )}
                  {doc.issueDate && (
                    <div>
                      <span className="text-muted-foreground">Issued:</span>
                      <p className="font-medium">{formatDate(doc.issueDate)}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Expires:</span>
                    <p className={`font-medium ${doc.computedStatus === "EXPIRED" ? "text-red-600" : doc.computedStatus === "EXPIRING_SOON" ? "text-yellow-600" : ""}`}>
                      {doc.expiryDate ? formatDate(doc.expiryDate) : "No expiry"}
                      {doc.daysUntilExpiry !== null && doc.daysUntilExpiry >= 0 && (
                        <span className="text-muted-foreground text-xs ml-1">
                          ({doc.daysUntilExpiry} days)
                        </span>
                      )}
                      {doc.daysUntilExpiry !== null && doc.daysUntilExpiry < 0 && (
                        <span className="text-red-600 text-xs ml-1">
                          ({Math.abs(doc.daysUntilExpiry)} days ago)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                {doc.issuingAuthority && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Issuing Authority:</span>
                    <p className="font-medium">{doc.issuingAuthority}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(doc)}
                    data-testid={`button-edit-doc-${doc.id}`}
                  >
                    <Edit className="h-4 w-4 mr-1" aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingDoc(doc)}
                    data-testid={`button-delete-doc-${doc.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Edit Document" : "Add Compliance Document"}</DialogTitle>
            <DialogDescription>
              {editingDoc
                ? "Update the compliance document details."
                : "Add a new license, permit, certificate, or other compliance document."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="entityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document For</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-entity-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OWNER">Owner / Business</SelectItem>
                        <SelectItem value="PROPERTY">Property</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="entityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{watchEntityType === "OWNER" ? "Owner" : "Property"}</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(parseInt(val))}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-entity">
                          <SelectValue placeholder={`Select ${watchEntityType.toLowerCase()}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {watchEntityType === "OWNER"
                          ? owners?.map((owner) => (
                              <SelectItem key={owner.id} value={owner.id.toString()}>
                                {owner.tradingName || owner.legalName}
                              </SelectItem>
                            ))
                          : properties?.map((property) => (
                              <SelectItem key={property.id} value={property.id.toString()}>
                                {property.name}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-doc-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="documentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Business License 2024"
                        {...field}
                        data-testid="input-doc-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="documentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Number (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., LIC-2024-12345"
                        {...field}
                        data-testid="input-doc-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issuingAuthority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuing Authority (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., City Business Bureau"
                        {...field}
                        data-testid="input-issuing-authority"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-issue-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-expiry-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="reminderDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reminder Lead Time (Days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                        data-testid="input-reminder-days"
                      />
                    </FormControl>
                    <FormDescription>
                      Get notified this many days before expiry
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes..."
                        {...field}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  data-testid="button-cancel-form"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-form">
                  {createMutation.isPending ? "Saving..." : editingDoc ? "Update" : "Add Document"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingDoc} onOpenChange={() => setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Compliance Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingDoc?.documentName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingDoc && deleteMutation.mutate(deletingDoc.id)}
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
