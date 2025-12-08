import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-16 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-title">{title}</h3>
      <p className="text-muted-foreground mb-6" data-testid="text-empty-description">{description}</p>
      {actionLabel && (actionHref || onAction) && (
        actionHref ? (
          <Link href={actionHref}>
            <Button data-testid="button-empty-action">{actionLabel}</Button>
          </Link>
        ) : (
          <Button onClick={onAction} data-testid="button-empty-action">{actionLabel}</Button>
        )
      )}
    </div>
  );
}
