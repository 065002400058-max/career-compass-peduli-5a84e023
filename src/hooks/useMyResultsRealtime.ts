import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Realtime sync hasil milik user yang sedang login.
 * Ketika admin/user menambah, mengubah, atau menghapus hasil tes,
 * dashboard langsung ter-refetch tanpa perlu logout/refresh manual.
 */
export const useMyResultsRealtime = (userId?: string | null) => {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const invalidate = () => {
      ["me-psikotes", "me-cbt", "me-referrals", "me-profile", "me-alumni"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] })
      );
    };

    const channel = supabase.channel(`my-results-${userId}`);
    (["cbt_attempts", "psikotes_attempts", "counseling_referrals"] as const).forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
        invalidate
      );
    });
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
      invalidate
    );
    channel.subscribe();

    // sinkron ulang ketika tab kembali aktif
    const onVisible = () => {
      if (document.visibilityState === "visible") invalidate();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
};

export default useMyResultsRealtime;
