import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Query keys yang bergantung pada tabel alumni. */
export const ALUMNI_QUERY_KEYS = [
  "alumni",
  "alumni-dashboard-agg",
  "admin-recent-alumni",
  "admin-monitoring",
  "admin-counts",
  "my-alumni",
  "me-alumni",
  "index-stats",
] as const;

/**
 * Berlangganan perubahan tabel alumni (realtime) lalu menyegarkan
 * seluruh cache terkait agar dashboard admin/alumni/santri sinkron
 * tanpa refresh manual.
 */
export const useAlumniRealtime = () => {
  const qc = useQueryClient();

  useEffect(() => {
    const invalidate = () =>
      ALUMNI_QUERY_KEYS.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));

    const channel = supabase
      .channel("alumni-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "alumni" }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
};

export default useAlumniRealtime;
