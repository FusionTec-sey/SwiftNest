import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2, FolderPlus, Building, Layers, Home, Bed, Grid, Box, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PropertyNodeWithChildren, PropertyNode } from "@shared/schema";

interface PropertyTreeProps {
  propertyId: number;
  canEdit: boolean;
}

const NODE_TYPE_ICONS: Record<string, typeof Building> = {
  BUILDING: Building,
  FLOOR: Layers,
  FLAT: Home,
  VILLA: Home,
  ROOM: Box,
  BED: Bed,
  SECTION: Grid,
  PLOT: Grid,
  CUSTOM: Tag,
};

const NODE_TYPES = ["BUILDING", "FLOOR", "FLAT", "VILLA", "ROOM", "BED", "SECTION", "PLOT", "CUSTOM"] as const;

type NodeType = (typeof NODE_TYPES)[number];

interface NodeFormData {
  label: string;
  nodeType: NodeType;
  parentId: number | null;
}

function TreeNode({
  node,
  depth,
  canEdit,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: PropertyNodeWithChildren;
  depth: number;
  canEdit: boolean;
  onAddChild: (parentId: number) => void;
  onEdit: (node: PropertyNode) => void;
  onDelete: (node: PropertyNode) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const Icon = NODE_TYPE_ICONS[node.nodeType] || Tag;

  return (
    <div className="select-none" data-testid={`tree-node-${node.id}`}>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-md hover-elevate group"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 rounded"
          data-testid={`button-toggle-${node.id}`}
          style={{ visibility: hasChildren ? "visible" : "hidden" }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        <span className="flex-1 text-sm font-medium truncate" data-testid={`text-label-${node.id}`}>
          {node.label}
        </span>

        <Badge variant="secondary" className="text-xs">
          {node.nodeType}
        </Badge>

        {canEdit && (
          <div className="flex items-center gap-1 invisible group-hover:visible">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onAddChild(node.id)}
              data-testid={`button-add-child-${node.id}`}
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onEdit(node)}
              data-testid={`button-edit-${node.id}`}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => onDelete(node)}
              data-testid={`button-delete-${node.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              canEdit={canEdit}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PropertyTree({ propertyId, canEdit }: PropertyTreeProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<PropertyNode | null>(null);
  const [formData, setFormData] = useState<NodeFormData>({
    label: "",
    nodeType: "BUILDING",
    parentId: null,
  });

  const { data: tree, isLoading } = useQuery<PropertyNodeWithChildren[]>({
    queryKey: ["/api/properties", propertyId, "tree"],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${propertyId}/tree`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch tree");
      return res.json();
    },
  });

  const createNodeMutation = useMutation({
    mutationFn: async (data: NodeFormData) => {
      return apiRequest("POST", `/api/properties/${propertyId}/nodes`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "tree"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({ title: "Node created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create node", description: error.message, variant: "destructive" });
    },
  });

  const updateNodeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<NodeFormData> }) => {
      return apiRequest("PUT", `/api/nodes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "tree"] });
      setIsEditDialogOpen(false);
      setSelectedNode(null);
      resetForm();
      toast({ title: "Node updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update node", description: error.message, variant: "destructive" });
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: number) => {
      return apiRequest("DELETE", `/api/nodes/${nodeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "tree"] });
      setIsDeleteDialogOpen(false);
      setSelectedNode(null);
      toast({ title: "Node deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete node", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ label: "", nodeType: "BUILDING", parentId: null });
  };

  const handleAddRoot = () => {
    setFormData({ label: "", nodeType: "BUILDING", parentId: null });
    setIsAddDialogOpen(true);
  };

  const handleAddChild = (parentId: number) => {
    setFormData({ label: "", nodeType: "ROOM", parentId });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (node: PropertyNode) => {
    setSelectedNode(node);
    setFormData({
      label: node.label,
      nodeType: node.nodeType as NodeType,
      parentId: node.parentId,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (node: PropertyNode) => {
    setSelectedNode(node);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label.trim()) return;
    createNodeMutation.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode || !formData.label.trim()) return;
    updateNodeMutation.mutate({
      id: selectedNode.id,
      data: { label: formData.label, nodeType: formData.nodeType },
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedNode) return;
    deleteNodeMutation.mutate(selectedNode.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4 ml-5" />
        <Skeleton className="h-8 w-3/4 ml-5" />
        <Skeleton className="h-8 w-1/2 ml-10" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Property Structure</h3>
        {canEdit && (
          <Button size="sm" onClick={handleAddRoot} data-testid="button-add-root-node">
            <Plus className="h-4 w-4 mr-1" />
            Add Node
          </Button>
        )}
      </div>

      {tree && tree.length > 0 ? (
        <div className="border rounded-md p-2" data-testid="property-tree">
          {tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              canEdit={canEdit}
              onAddChild={handleAddChild}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-md" data-testid="empty-tree">
          <Building className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No structure defined yet</p>
          {canEdit && (
            <p className="text-sm mt-1">Click "Add Node" to start building your property structure</p>
          )}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formData.parentId ? "Add Child Node" : "Add Root Node"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Building A, Floor 1, Flat 101"
                data-testid="input-node-label"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nodeType">Type</Label>
              <Select
                value={formData.nodeType}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, nodeType: value as NodeType }))}
              >
                <SelectTrigger data-testid="select-node-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {NODE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createNodeMutation.isPending} data-testid="button-save-node">
                {createNodeMutation.isPending ? "Adding..." : "Add Node"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Node</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-label">Label</Label>
              <Input
                id="edit-label"
                value={formData.label}
                onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                data-testid="input-edit-node-label"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nodeType">Type</Label>
              <Select
                value={formData.nodeType}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, nodeType: value as NodeType }))}
              >
                <SelectTrigger data-testid="select-edit-node-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {NODE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateNodeMutation.isPending} data-testid="button-update-node">
                {updateNodeMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Node</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete "{selectedNode?.label}"? This will also delete all child nodes.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteNodeMutation.isPending}
              data-testid="button-confirm-delete-node"
            >
              {deleteNodeMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
