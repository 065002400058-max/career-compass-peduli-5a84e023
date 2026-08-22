import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

const IDLE_MS = 30 * 60 * 1000; // auto logout setelah 30 menit tanpa aktivitas
const LAST_ACTIVITY_KEY = "peduli:last_activity";
const WARNING_MS = 60 * 1000; // peringatan 60 detik sebelum logout

const EVENTS = ["mousedown", "click", "mousemove", "keydown", "touchstart", "scroll", "visibilitychange"];

const IdleTimeoutGuard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
    toast.info("Sesi berakhir otomatis karena tidak ada aktivitas selama 30 menit.");
    navigate("/auth", { replace: true });
  }, [clearAll, navigate, signOut]);

  const schedule = useCallback(() => {
    clearAll();
    setWarn(false);
    // last_activity dipakai saat aplikasi dibuka kembali / antar tab
    try {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    } catch { /* storage tidak tersedia */ }
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

    // Saat aplikasi dibuka kembali: jika sudah lewat 3 menit, wajib login lagi.
    const stored = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY) ?? 0);
    if (stored && Date.now() - stored > IDLE_MS) {
      doLogout();
      return;
    }

    schedule();
    const onActivity = () => {
      // Saat modal peringatan tampil, hanya tombol "Tetap Masuk" yang memperpanjang sesi
      if (!warn) schedule();
    };
    // Sinkronisasi antar tab: aktivitas di tab lain memperpanjang sesi di tab ini
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LAST_ACTIVITY_KEY || warn) return;
      clearAll();
      warnTimer.current = window.setTimeout(() => {
        setLeft(Math.round(WARNING_MS / 1000));
        setWarn(true);
        tick.current = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
      }, IDLE_MS - WARNING_MS) as unknown as number;
      logoutTimer.current = window.setTimeout(doLogout, IDLE_MS) as unknown as number;
    };

    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    window.addEventListener("storage", onStorage);
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener("storage", onStorage);
      clearAll();
    };
  }, [user, warn, schedule, clearAll, doLogout]);

  // Pindah halaman dihitung sebagai aktivitas pengguna
  useEffect(() => {
    if (user && !warn) schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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
