import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Upload,
  FileText,
  Image,
  Download,
  Share2,
  Trash2,
  Copy,
  Check,
  File,
  Receipt,
  FileCheck,
  Camera,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

type DocumentType = "INVOICE" | "RECEIPT" | "PAYMENT_PROOF" | "CONTRACT" | "PHOTO" | "REPORT" | "OTHER";
type SourceModule = "PROPERTY" | "UNIT" | "LEASE" | "TENANT" | "METER" | "BILL" | "INVOICE" | "PAYMENT" | "MAINTENANCE_ISSUE" | "MAINTENANCE_TASK" | "LOAN" | "ASSET" | "OWNER";

interface Document {
  id: number;
  originalName: string;
  description: string | null;
  documentType: string;
  module: string;
  moduleId: number;
  propertyId: number | null;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  shareToken: string | null;
  shareExpiresAt: string | null;
  uploadedByUserId: number;
  createdAt: string;
}

interface DocumentManagerProps {
  module: SourceModule;
  moduleId: number;
  propertyId?: number;
  title?: string;
  allowedTypes?: DocumentType[];
}

const documentTypeLabels: Record<DocumentType, string> = {
  INVOICE: "Invoice",
  RECEIPT: "Receipt",
  PAYMENT_PROOF: "Payment Proof",
  CONTRACT: "Contract",
  PHOTO: "Photo",
  REPORT: "Report",
  OTHER: "Other",
};

const documentTypeIcons: Record<DocumentType, typeof FileText> = {
  INVOICE: FileSpreadsheet,
  RECEIPT: Receipt,
  PAYMENT_PROOF: FileCheck,
  CONTRACT: FileText,
  PHOTO: Camera,
  REPORT: FileText,
  OTHER: File,
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function DocumentManager({
  module,
  moduleId,
  propertyId,
  title = "Documents",
  allowedTypes,
}: DocumentManagerProps) {
  const { toast } = useToast();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    documentType: "" as DocumentType | "",
    file: null as File | null,
  });

  const availableTypes = allowedTypes || Object.keys(documentTypeLabels) as DocumentType[];

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents", module, moduleId],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${module}/${moduleId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/documents", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload document");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", module, moduleId] });
      toast({ title: "Document uploaded successfully" });
      setShowUploadDialog(false);
      setUploadForm({ title: "", description: "", documentType: "", file: null });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: number) => {
      return apiRequest("DELETE", `/api/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", module, moduleId] });
      toast({ title: "Document deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async ({ docId, expiresInHours }: { docId: number; expiresInHours: number }) => {
      const res = await apiRequest("POST", `/api/documents/${docId}/share`, { expiresInHours });
      return res.json();
    },
    onSuccess: (data: { shareUrl: string }) => {
      setShareUrl(data.shareUrl);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to generate share link", description: error.message, variant: "destructive" });
    },
  });

  const handleUpload = () => {
    if (!uploadForm.file || !uploadForm.title || !uploadForm.documentType) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadForm.file);
    formData.append("title", uploadForm.title);
    formData.append("description", uploadForm.description);
    formData.append("documentType", uploadForm.documentType);
    formData.append("module", module);
    formData.append("moduleId", moduleId.toString());
    if (propertyId) {
      formData.append("propertyId", propertyId.toString());
    }

    uploadMutation.mutate(formData);
  };

  const handleDownload = (doc: Document) => {
    window.open(`/api/documents/${doc.id}/download`, "_blank");
  };

  const handleShare = (doc: Document) => {
    setSelectedDocument(doc);
    setShareUrl(null);
    setCopied(false);
    setShowShareDialog(true);
    shareMutation.mutate({ docId: doc.id, expiresInHours: 24 });
  };

  const handleCopyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const handleNativeShare = async () => {
    if (shareUrl && navigator.share) {
      try {
        await navigator.share({
          title: selectedDocument?.originalName || "Shared Document",
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast({ title: "Share failed", variant: "destructive" });
        }
      }
    }
  };

  const confirmDelete = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const getDocTypeIcon = (docType: string) => {
    return documentTypeIcons[docType as DocumentType] || File;
  };

  const getDocTypeLabel = (docType: string) => {
    return documentTypeLabels[docType as DocumentType] || docType;
  };

  const handleDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete.id);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const isImage = (mimeType: string) => mimeType.startsWith("image/");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <Button size="sm" onClick={() => setShowUploadDialog(true)} data-testid="button-upload-document">
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const TypeIcon = getDocTypeIcon(doc.documentType);
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-md border hover-elevate"
                  data-testid={`document-item-${doc.id}`}
                >
                  <div className="flex-shrink-0">
                    {isImage(doc.mimeType) ? (
                      <Image className="w-8 h-8 text-muted-foreground" />
                    ) : (
                      <TypeIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.originalName}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {getDocTypeLabel(doc.documentType)}
                      </Badge>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>{format(new Date(doc.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{doc.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDownload(doc)}
                      data-testid={`button-download-${doc.id}`}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleShare(doc)}
                      data-testid={`button-share-${doc.id}`}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => confirmDelete(doc)}
                      data-testid={`button-delete-${doc.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="upload-title">Title *</Label>
              <Input
                id="upload-title"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="Document title"
                data-testid="input-document-title"
              />
            </div>
            <div>
              <Label htmlFor="upload-type">Document Type *</Label>
              <Select
                value={uploadForm.documentType}
                onValueChange={(value: DocumentType) => setUploadForm({ ...uploadForm, documentType: value })}
              >
                <SelectTrigger id="upload-type" data-testid="select-document-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {documentTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="upload-description">Description</Label>
              <Textarea
                id="upload-description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
                data-testid="input-document-description"
              />
            </div>
            <div>
              <Label htmlFor="upload-file">File *</Label>
              <Input
                id="upload-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                data-testid="input-document-file"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supported: PDF, DOC, DOCX, JPG, PNG, GIF, WebP (max 10MB)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              data-testid="button-confirm-upload"
            >
              {uploadMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate a temporary link to share this document. The link will expire in 24 hours.
            </p>
            {shareMutation.isPending ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : shareUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input value={shareUrl} readOnly className="flex-1" data-testid="input-share-url" />
                  <Button size="icon" onClick={handleCopyShareUrl} data-testid="button-copy-share-url">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                  <Button variant="outline" className="w-full" onClick={handleNativeShare} data-testid="button-native-share">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share via Apps
                  </Button>
                )}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.originalName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
