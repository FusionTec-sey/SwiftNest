import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Building2, 
  Home, 
  Users, 
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { allTemplates, type ImportResult } from "@shared/bulk-import";

interface ReferenceData {
  properties: Array<{ id: number; name: string }>;
  units: Array<{ id: number; unitName: string; propertyId: number }>;
  tenants: Array<{ id: number; legalName: string; propertyId: number }>;
}

const entityIcons: Record<string, typeof Building2> = {
  properties: Building2,
  units: Home,
  tenants: Users,
  leases: FileText,
};

const entityColors: Record<string, string> = {
  properties: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  units: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  tenants: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  leases: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
};

export default function BulkImportPage() {
  const { toast } = useToast();
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<ImportResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showReferenceDialog, setShowReferenceDialog] = useState(false);

  const { data: referenceData } = useQuery<ReferenceData>({
    queryKey: ["/api/bulk-import/reference-data"],
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ entity, file }: { entity: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`/api/bulk-import/${entity}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      
      return response.json() as Promise<ImportResult>;
    },
    onSuccess: (result) => {
      setUploadResult(result);
      setShowResultDialog(true);
      setSelectedFile(null);
      
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-import/reference-data"] });
      
      if (result.successCount > 0) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${result.successCount} ${result.entity}`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownloadTemplate = (entity: string) => {
    window.open(`/api/bulk-import/template/${entity}`, "_blank");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, entity: string) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedEntity(entity);
    }
  };

  const handleUpload = () => {
    if (selectedFile && selectedEntity) {
      uploadMutation.mutate({ entity: selectedEntity, file: selectedFile });
    }
  };

  const getImportOrder = () => {
    return [
      { step: 1, entity: "properties", description: "Import properties first - they are the foundation" },
      { step: 2, entity: "units", description: "Import units - they require Property IDs" },
      { step: 3, entity: "tenants", description: "Import tenants - they require Property IDs" },
      { step: 4, entity: "leases", description: "Import leases last - they require Property, Unit, and Tenant IDs" },
    ];
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Bulk Import</h1>
            <p className="text-muted-foreground">
              Import properties, units, tenants, and leases from Excel files
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowReferenceDialog(true)}
            data-testid="button-view-reference"
          >
            <Info className="mr-2 h-4 w-4" aria-hidden="true" />
            View Reference IDs
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Import Order Matters</AlertTitle>
          <AlertDescription>
            Import data in this order: Properties, then Units, then Tenants, then Leases.
            Each subsequent import requires IDs from previous imports.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          {allTemplates.map((template) => {
            const Icon = entityIcons[template.entity] || FileSpreadsheet;
            const colorClass = entityColors[template.entity] || "";
            const step = getImportOrder().find(o => o.entity === template.entity)?.step || 0;
            
            return (
              <Card key={template.entity} data-testid={`card-import-${template.entity}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md ${colorClass}`}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{template.displayName}</CardTitle>
                        <Badge variant="outline" className="mt-1">Step {step}</Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleDownloadTemplate(template.entity)}
                      data-testid={`button-download-${template.entity}`}
                    >
                      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                      Download Template
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label htmlFor={`file-${template.entity}`}>Upload Filled Template</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`file-${template.entity}`}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => handleFileSelect(e, template.entity)}
                        className="flex-1"
                        data-testid={`input-file-${template.entity}`}
                      />
                    </div>
                    {selectedFile && selectedEntity === template.entity && (
                      <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileSpreadsheet className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          <span className="text-sm truncate">{selectedFile.name}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleUpload}
                          disabled={uploadMutation.isPending}
                          data-testid={`button-upload-${template.entity}`}
                        >
                          {uploadMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                              Import
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <strong>Required fields:</strong>{" "}
                    {template.columns
                      .filter(c => c.required)
                      .map(c => c.header)
                      .join(", ")}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {uploadResult?.errorCount === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" aria-hidden="true" />
                )}
                Import Results
              </DialogTitle>
              <DialogDescription>
                {uploadResult?.entity && `Import summary for ${uploadResult.entity}`}
              </DialogDescription>
            </DialogHeader>

            {uploadResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-muted rounded-md">
                    <div className="text-2xl font-bold">{uploadResult.totalRows}</div>
                    <div className="text-xs text-muted-foreground">Total Rows</div>
                  </div>
                  <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-md">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {uploadResult.successCount}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">Imported</div>
                  </div>
                  <div className="text-center p-3 bg-red-100 dark:bg-red-900/30 rounded-md">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {uploadResult.errorCount}
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400">Errors</div>
                  </div>
                </div>

                {uploadResult.successCount > 0 && (
                  <div className="text-sm">
                    <Progress 
                      value={(uploadResult.successCount / uploadResult.totalRows) * 100} 
                      className="h-2"
                    />
                    <p className="mt-1 text-muted-foreground">
                      {Math.round((uploadResult.successCount / uploadResult.totalRows) * 100)}% success rate
                    </p>
                  </div>
                )}

                {uploadResult.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                      Errors ({uploadResult.errors.length})
                    </h4>
                    <ScrollArea className="h-40 border rounded-md p-2">
                      <div className="space-y-2">
                        {uploadResult.errors.map((error, idx) => (
                          <div key={idx} className="text-sm p-2 bg-destructive/10 rounded">
                            <span className="font-medium">Row {error.row}:</span> {error.message}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {uploadResult.createdIds.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Created IDs: {uploadResult.createdIds.slice(0, 10).join(", ")}
                    {uploadResult.createdIds.length > 10 && ` and ${uploadResult.createdIds.length - 10} more`}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setShowResultDialog(false)} data-testid="button-close-results">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showReferenceDialog} onOpenChange={setShowReferenceDialog}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reference IDs</DialogTitle>
              <DialogDescription>
                Use these IDs when importing units, tenants, and leases
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {referenceData?.properties && referenceData.properties.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                    Properties
                  </h4>
                  <ScrollArea className="h-32 border rounded-md p-2">
                    <div className="space-y-1">
                      {referenceData.properties.map((p) => (
                        <div key={p.id} className="text-sm flex items-center gap-2">
                          <Badge variant="outline">{p.id}</Badge>
                          <span>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {referenceData?.units && referenceData.units.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Home className="h-4 w-4" aria-hidden="true" />
                    Units
                  </h4>
                  <ScrollArea className="h-32 border rounded-md p-2">
                    <div className="space-y-1">
                      {referenceData.units.map((u) => (
                        <div key={u.id} className="text-sm flex items-center gap-2">
                          <Badge variant="outline">{u.id}</Badge>
                          <span>{u.unitName}</span>
                          <span className="text-muted-foreground">(Property: {u.propertyId})</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {referenceData?.tenants && referenceData.tenants.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    Tenants
                  </h4>
                  <ScrollArea className="h-32 border rounded-md p-2">
                    <div className="space-y-1">
                      {referenceData.tenants.map((t) => (
                        <div key={t.id} className="text-sm flex items-center gap-2">
                          <Badge variant="outline">{t.id}</Badge>
                          <span>{t.legalName}</span>
                          <span className="text-muted-foreground">(Property: {t.propertyId})</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {(!referenceData?.properties?.length && !referenceData?.units?.length && !referenceData?.tenants?.length) && (
                <div className="text-center py-8 text-muted-foreground">
                  No reference data available. Import properties first to get started.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setShowReferenceDialog(false)} data-testid="button-close-reference">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
