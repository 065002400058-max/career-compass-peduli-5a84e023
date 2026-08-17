import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  /** Human label, e.g. "lowongan" */
  label: string;
  count: number;
  /** Executes the deletion; throw on failure */
  onDelete: () => Promise<void>;
  className?: string;
}

/** Two-step confirmation "Hapus Semua" button used across admin managers. */
const DeleteAllButton = ({ label, count, onDelete, className }: Props) => {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (count === 0) return toast.info(`Tidak ada data ${label} untuk dihapus`);
    if (!confirm(`Hapus SEMUA ${count} data ${label}? Tindakan ini tidak dapat dibatalkan.`)) return;
    if (!confirm(`Konfirmasi terakhir: seluruh data ${label} akan hilang permanen. Lanjutkan?`)) return;
    setBusy(true);
    try {
      await onDelete();
      toast.success(`Semua data ${label} dihapus`);
    } catch (e: any) {
      toast.error(`Gagal menghapus: ${e?.message ?? "terjadi kesalahan"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy || count === 0}
      onClick={run}
      className={`text-destructive border-destructive/30 hover:bg-destructive/10 ${className ?? ""}`}
    >
      <Trash2 className="h-4 w-4 mr-1" />
      {busy ? "Menghapus..." : "Hapus Semua"}
    </Button>
  );
};

export default DeleteAllButton;
