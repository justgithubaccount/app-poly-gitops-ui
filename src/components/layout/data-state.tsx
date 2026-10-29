import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof Error ? error.message : "Не удалось получить данные";
  return (
    <Alert role="alert" aria-label="Ошибка загрузки">
      <AlertTitle>Не удалось загрузить данные</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-section-head">
        <p className="break-words">{message}</p>
        <Button variant="outline" onClick={onRetry}>
          Повторить загрузку
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function ReadNotice({ stale, refreshing }: { stale: boolean; refreshing: boolean }) {
  if (stale)
    return (
      <p role="status" className="text-caption text-warning">
        Обновление не удалось. Показаны последние полученные данные.
      </p>
    );
  if (refreshing)
    return (
      <p role="status" className="text-caption text-muted-foreground">
        Обновление данных…
      </p>
    );
  return null;
}

export function ListSkeleton() {
  return (
    <div role="status" aria-label="Загрузка данных" className="flex flex-col gap-section-head">
      {[1, 2, 3].map((key) => (
        <Skeleton key={key} className="h-row-comfortable w-full" />
      ))}
    </div>
  );
}
