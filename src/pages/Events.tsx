import { CalendarDays, MapPin, Clock, Users, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const events = [
  { id: 1, title: "Career Fair 2026", type: "Career Fair", date: "15 April 2026", time: "08:00 - 16:00", location: "Auditorium Utama", attendees: 500, desc: "Pameran kerja tahunan dengan 50+ perusahaan mitra." },
  { id: 2, title: "Workshop: CV & Interview Tips", type: "Workshop", date: "20 Maret 2026", time: "09:00 - 12:00", location: "Ruang Seminar Lt.3", attendees: 120, desc: "Pelajari cara membuat CV yang menarik dan teknik wawancara." },
  { id: 3, title: "Seminar: Karier di Era Digital", type: "Seminar", date: "25 Maret 2026", time: "13:00 - 15:00", location: "Hall B", attendees: 200, desc: "Pembicara dari industri teknologi berbagi insight karier digital." },
  { id: 4, title: "Company Talk: Tokopedia", type: "Company Talk", date: "5 April 2026", time: "10:00 - 12:00", location: "Ruang Meeting A", attendees: 80, desc: "Sesi sharing dari tim HR Tokopedia tentang peluang karier." },
  { id: 5, title: "Workshop: Digital Marketing", type: "Workshop", date: "10 April 2026", time: "09:00 - 15:00", location: "Lab Komputer", attendees: 60, desc: "Pelatihan hands-on digital marketing dan social media." },
  { id: 6, title: "Seminar: Entrepreneurship", type: "Seminar", date: "28 April 2026", time: "13:00 - 16:00", location: "Auditorium Utama", attendees: 300, desc: "Belajar memulai bisnis dari founder startup sukses." },
];

const typeColor: Record<string, string> = {
  "Career Fair": "default",
  Workshop: "secondary",
  Seminar: "outline",
  "Company Talk": "secondary",
};

const Events = () => (
  <div className="min-h-screen gradient-bg-subtle">
    <div className="container mx-auto section-padding">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">Event Karier</h1>
        <p className="text-muted-foreground mt-1">Seminar, workshop, job fair, dan company talk</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {events.map((e) => (
          <div key={e.id} className="glass-card-hover rounded-xl overflow-hidden">
            <div className="gradient-bg p-4">
              <Badge variant={typeColor[e.type] as any} className="mb-2">{e.type}</Badge>
              <h3 className="font-heading font-semibold text-primary-foreground text-lg">{e.title}</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-muted-foreground mb-4">{e.desc}</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" />{e.date}</p>
                <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" />{e.time}</p>
                <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{e.location}</p>
                <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />{e.attendees} peserta</p>
              </div>
              <Button className="w-full mt-4" size="sm">Daftar Event</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default Events;
