import { CalendarDays, MapPin, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const typeColor: Record<string, string> = {
  "Career Fair": "default",
  Workshop: "secondary",
  Seminar: "outline",
  "Company Talk": "secondary",
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
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Event Karier</h1>
          <p className="text-muted-foreground mt-1">Seminar, workshop, job fair, dan company talk</p>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Memuat data...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Belum ada event yang dijadwalkan.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((e) => (
              <div key={e.id} className="glass-card-hover rounded-xl overflow-hidden">
                <div className="gradient-bg p-4">
                  <Badge variant={(typeColor[e.type] as any) || "secondary"} className="mb-2">{e.type}</Badge>
                  <h3 className="font-heading font-semibold text-primary-foreground text-lg">{e.title}</h3>
                </div>
                <div className="p-5">
                  {e.description && <p className="text-sm text-muted-foreground mb-4">{e.description}</p>}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(e.date), "d MMMM yyyy", { locale: idLocale })}</p>
                    <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" />{format(new Date(e.date), "HH:mm")}</p>
                    <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{e.location}</p>
                    {e.capacity && <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />{e.capacity} peserta</p>}
                  </div>
                  <Button className="w-full mt-4" size="sm">Daftar Event</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
