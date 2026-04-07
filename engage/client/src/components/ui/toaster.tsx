import { useToast } from "../../hooks/use-toast";

export function Toaster() {
  const { toasts } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => (
        <div key={t.id} className={`rounded-lg border p-4 shadow-lg bg-background ${t.variant === "destructive" ? "border-destructive text-destructive" : "border-border"}`}>
          <p className="font-medium text-sm">{t.title}</p>
          {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
        </div>
      ))}
    </div>
  );
}
