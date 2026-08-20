import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const IDLE_MS = 3 * 60 * 1000; // auto logout setelah 3 menit tanpa aktivitas
const WARNING_MS = 30 * 1000; // peringatan 30 detik sebelum logout

const EVENTS = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "visibilitychange"];

const IdleTimeoutGuard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [warn, setWarn] = useState(false);
  const [left, setLeft] = useState(Math.round(WARNING_MS / 1000));

  const warnTimer = useRef<number | null>(null);
  const logoutTimer = useRef<number | null>(null);
  const tick = useRef<number | null>(null);

  const clearAll = useCallback(() => {
    [warnTimer, logoutTimer, tick].forEach((t) => {
      if (t.current) window.clearInterval(t.current);
      t.current = null;
    });
  }, []);

  const doLogout = useCallback(async () => {
    clearAll();
    setWarn(false);
    await signOut();
    toast.info("Sesi berakhir otomatis karena tidak ada aktivitas selama 3 menit.");
    navigate("/auth", { replace: true });
  }, [clearAll, navigate, signOut]);

  const schedule = useCallback(() => {
    clearAll();
    setWarn(false);
    warnTimer.current = window.setTimeout(() => {
      setLeft(Math.round(WARNING_MS / 1000));
      setWarn(true);
      tick.current = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    }, IDLE_MS - WARNING_MS) as unknown as number;
    logoutTimer.current = window.setTimeout(doLogout, IDLE_MS) as unknown as number;
  }, [clearAll, doLogout]);

  useEffect(() => {
    if (!user) {
      clearAll();
      setWarn(false);
      return;
    }
    schedule();
    const onActivity = () => {
      // Saat modal peringatan tampil, hanya tombol "Tetap Masuk" yang memperpanjang sesi
      if (!warn) schedule();
    };
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearAll();
    };
  }, [user, warn, schedule, clearAll]);

  if (!user) return null;

  return (
    <AlertDialog open={warn}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading">Sesi akan berakhir</AlertDialogTitle>
          <AlertDialogDescription>
            Tidak ada aktivitas terdeteksi. Anda akan keluar otomatis dalam{" "}
            <span className="font-semibold text-foreground">{left} detik</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={doLogout}>Keluar Sekarang</Button>
          <AlertDialogAction onClick={schedule}>Tetap Masuk</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default IdleTimeoutGuard;
