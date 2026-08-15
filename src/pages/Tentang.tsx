import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin } from "lucide-react";

const faqs = [
  {
    q: "Apa itu Smart Career Center PEDULI?",
    a: "Platform karier terpadu untuk santri, alumni, dan perusahaan mitra Pesantren Daarul 'Uluum Lido — mencakup lowongan kerja, beasiswa, tes CBT, konseling, dan jejaring alumni.",
  },
  {
    q: "Siapa yang bisa mendaftar?",
    a: "Santri aktif dan alumni pesantren. Perusahaan mitra dapat bergabung melalui akun Mitra untuk memasang lowongan.",
  },
  {
    q: "Apakah Tes CBT dan Konseling gratis?",
    a: "Ya, seluruh layanan tes potensi akademik, minat bakat, dan screening mental gratis untuk santri dan alumni.",
  },
  {
    q: "Bagaimana cara melamar lowongan kerja?",
    a: "Masuk ke akun Anda, buka menu Karier › Lowongan Kerja, lalu klik tombol Lamar pada lowongan yang diminati.",
  },
  {
    q: "Apakah data saya aman?",
    a: "Data disimpan terenkripsi dan hanya dapat diakses oleh Anda serta admin career center sesuai kebutuhan pembinaan karier.",
  },
];

const Tentang = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [hash]);

  return (
    <main className="container mx-auto px-4 py-10 md:py-14 max-w-4xl">
      <section id="tentang" className="scroll-mt-24">
        <h1 className="font-heading text-2xl md:text-4xl font-bold mb-3">Tentang Career Center PEDULI</h1>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
          Smart Career Center PEDULI adalah layanan pengembangan karier milik Pesantren Modern Daarul 'Uluum Lido
          bersama Yayasan Salsabila Lido, yang mendampingi santri dan alumni dari bangku pesantren hingga dunia kerja
          maupun perguruan tinggi.
        </p>
        <div className="grid gap-4 sm:grid-cols-3 mt-6">
          {[
            { t: "Visi", d: "Menjadi pusat karier pesantren yang unggul, berakhlak, dan berdaya saing global." },
            { t: "Misi", d: "Menyediakan bimbingan karier, tes potensi, konseling, serta akses beasiswa dan kerja." },
            { t: "Nilai", d: "Peduli, amanah, profesional, dan berorientasi pada kemaslahatan umat." },
          ].map((i) => (
            <Card key={i.t} className="card-glass">
              <CardContent className="p-5">
                <h3 className="font-heading font-semibold mb-1">{i.t}</h3>
                <p className="text-sm text-muted-foreground">{i.d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 mt-12">
        <h2 className="font-heading text-xl md:text-3xl font-bold mb-4">FAQ</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, idx) => (
            <AccordionItem key={idx} value={`i${idx}`}>
              <AccordionTrigger className="text-left text-sm md:text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section id="kontak" className="scroll-mt-24 mt-12">
        <h2 className="font-heading text-xl md:text-3xl font-bold mb-4">Kontak</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { Icon: Mail, t: "Email", d: "info@careercenter-peduli.id" },
            { Icon: Phone, t: "Telepon", d: "+62 812 3456 7890" },
            { Icon: MapPin, t: "Alamat", d: "Pesantren Daarul 'Uluum Lido, Bogor, Jawa Barat" },
          ].map(({ Icon, t, d }) => (
            <Card key={t} className="card-glass">
              <CardContent className="p-5">
                <Icon className="h-5 w-5 text-primary mb-2" />
                <h3 className="font-heading font-semibold mb-1">{t}</h3>
                <p className="text-sm text-muted-foreground break-words">{d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Tentang;
