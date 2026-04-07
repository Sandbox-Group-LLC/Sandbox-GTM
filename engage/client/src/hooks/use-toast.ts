import { useState, useCallback } from "react";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

let globalToasts: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

function notify(toasts: Toast[]) {
  globalToasts = toasts;
  listeners.forEach(l => l(toasts));
}

export function toast({ title, description, variant = "default" }: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2);
  notify([...globalToasts, { id, title, description, variant }]);
  setTimeout(() => notify(globalToasts.filter(t => t.id !== id)), 4000);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(globalToasts);
  useState(() => {
    const listener = (t: Toast[]) => setToasts([...t]);
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  });
  return { toast, toasts };
}
