import { CalendarDays, MapPin, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { motion } from "framer-motion";

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
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const Events = () => {
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
                  <Button className="w-full mt-4 gradient-bg border-0 hover:opacity-90 transition-opacity" size="sm">Daftar Event</Button>
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
