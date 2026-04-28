import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/types";

const map: Record<InvoiceStatus, { label: string; cls: string }> = {
  brouillon: { label: "Brouillon", cls: "bg-muted text-muted-foreground" },
  envoyee: { label: "Envoyée", cls: "bg-accent-soft text-accent" },
  payee: { label: "Payée", cls: "bg-success-soft text-success" },
  annulee: { label: "Annulée", cls: "bg-destructive-soft text-destructive" },
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const v = map[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", v.cls)}>
      {v.label}
    </span>
  );
}
