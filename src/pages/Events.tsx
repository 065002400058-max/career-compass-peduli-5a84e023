import { CalendarDays, MapPin, Clock, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import EventsManager from "@/components/admin/EventsManager";
import { toast } from "sonner";


const typeColor: Record<string, string> = {
  "Career Fair": "default",
  Workshop: "secondary",
  Seminar: "outline",
  "Company Talk": "secondary",
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const downloadIcs = (ev: any) => {
  const dt = new Date(ev.date);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const end = new Date(dt.getTime() + 2 * 60 * 60 * 1000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Career Center PEDULI//ID",
    "BEGIN:VEVENT",
    `UID:${ev.id}@careerpeduli`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(dt)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${ev.title}`,
    `LOCATION:${ev.location ?? ""}`,
    `DESCRIPTION:${(ev.description ?? "").replace(/\n/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ev.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Event ditambahkan ke kalender Anda");
};

const Events = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen gradient-bg-subtle islamic-pattern-bg">
      <div className="container mx-auto section-padding">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-heading text-3xl font-bold text-foreground">Event Karier</h1>
          <p className="text-muted-foreground mt-1">Seminar, workshop, job fair, dan company talk</p>
        </motion.div>

        {isAdmin && (
          <Tabs defaultValue="list" className="mb-6">
            <TabsList className="glass-card flex-wrap h-auto">
              <TabsTrigger value="list">Daftar Event</TabsTrigger>
              <TabsTrigger value="manage"><Settings className="h-4 w-4 mr-2" />Kelola (Admin)</TabsTrigger>
            </TabsList>
            <TabsContent value="list" />
            <TabsContent value="manage"><EventsManager /></TabsContent>
          </Tabs>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-xl overflow-hidden animate-pulse">
                <div className="bg-muted h-24" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <motion.div
            className="text-center py-16 text-muted-foreground"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Belum ada event yang dijadwalkan.</p>
          </motion.div>
        ) : (
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {events.map((e) => (
              <motion.div
                key={e.id}
                variants={item}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="glass-card rounded-xl overflow-hidden border-primary/10 group"
              >
                <div className="gradient-bg p-4 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.3' fill-rule='evenodd'%3E%3Cpath d='M20 18v-2h-2v2h-2v2h2v2h2v-2h2v-2h-2z'/%3E%3C/g%3E%3C/svg%3E\")"
                  }} />
                  <Badge variant={(typeColor[e.type] as any) || "secondary"} className="mb-2 relative z-10">{e.type}</Badge>
                  <h3 className="font-heading font-semibold text-primary-foreground text-lg relative z-10">{e.title}</h3>
                </div>
                <div className="p-5">
                  {e.description && <p className="text-sm text-muted-foreground mb-4">{e.description}</p>}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-primary" />{format(new Date(e.date), "d MMMM yyyy", { locale: idLocale })}</p>
                    <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" />{format(new Date(e.date), "HH:mm")}</p>
                    <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" />{e.location}</p>
                    {e.capacity && <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-primary" />{e.capacity} peserta</p>}
                  </div>
                  <Button className="w-full mt-4 gradient-bg border-0 hover:opacity-90 transition-opacity" size="sm" onClick={() => downloadIcs(e)}>Simpan ke Kalender</Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Events;
