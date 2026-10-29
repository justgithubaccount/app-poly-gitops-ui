import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-group", className)}>
      <div className="min-w-0">
        <h1 className="break-words text-page-display">{title}</h1>
        {description && (
          <p className="mt-inline max-w-reading text-body-supporting text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions}
    </header>
  );
}
