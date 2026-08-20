import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, GraduationCap, MapPin, Building2, User, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { decodeId } from "@/lib/publicId";
import { alumniStatus, getStatusLabel } from "@/lib/alumniStatus";

const show = (v?: string | number | null, fallback = "-") =>
  v === null || v === undefined || String(v).trim() === "" ? fallback : String(v);

const AlumniDetail = () => {
  const { id: publicId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const alumniId = decodeId(publicId);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["alumni-detail", alumniId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alumni")
        .select("*")
        .eq("id", alumniId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!alumniId && !!user,
  });

  const rows: { icon: typeof User; label: string; value: string }[] = data
    ? [
        { icon: User, label: "Jenis Kelamin", value: show(data.gender) },
        { icon: CalendarDays, label: "Angkatan", value: show(data.graduation_year) },
        { icon: MapPin, label: "Asal", value: show(data.origin) },
        { icon: GraduationCap, label: "Jenjang Pendidikan", value: show(data.education_level) },
        { icon: GraduationCap, label: "Jurusan", value: show(data.major) },
        { icon: GraduationCap, label: "Universitas", value: show(data.university) },
        { icon: GraduationCap, label: "Status Kampus", value: show(data.university_status) },
        { icon: Briefcase, label: "Posisi / Pekerjaan", value: show(data.position ?? data.current_position) },
        { icon: Building2, label: "Perusahaan / Instansi", value: show(data.company ?? data.current_company) },
        { icon: Building2, label: "Jenis Perusahaan", value: show(data.company_type) },
        { icon: Briefcase, label: "Bidang Pekerjaan", value: show(data.job_field) },
        {
          icon: MapPin,
          label: "Lokasi Kerja",
          value: show(
            [data.work_city, data.work_province, data.work_country].filter(Boolean).join(", ") ||
              data.location,
          ),
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="container-page py-6 md:py-8 space-y-5">
        <Button variant="ghost" size="sm" className="h-9 -ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali
        </Button>

        {isLoading || authLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : isError || !data ? (
          <Card className="rounded-2xl">
            <CardContent className="py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Data alumni tidak ditemukan atau Anda tidak memiliki akses.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/alumni">Lihat Direktori Alumni</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="rounded-2xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="font-heading text-xl md:text-2xl">
                    {show(data.full_name || data.name, "Alumni")}
                  </CardTitle>
                  <Badge variant="secondary" className="text-[11px]">
                    {getStatusLabel(alumniStatus(data as never))}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Angkatan {show(data.graduation_year)} &middot; ID publik: {publicId}
                </p>
              </CardHeader>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading">Data Lengkap Alumni</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {rows.map((r) => (
                  <div key={r.label} className="rounded-xl border border-border bg-muted/30 p-3 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <r.icon className="h-3.5 w-3.5 shrink-0" />
                      {r.label}
                    </div>
                    <p className="mt-1 text-sm font-medium break-words">{r.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
};

export default AlumniDetail;
