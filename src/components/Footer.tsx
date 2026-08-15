import { Link } from "react-router-dom";
import { Briefcase, Info, Phone, Mail, Instagram, Linkedin, Youtube, MessageCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import duLogo from "@/assets/du-logo-t.png.asset.json";
import yayasanLogo from "@/assets/yayasan-logo-t.png.asset.json";
import trisaktiLogo from "@/assets/trisakti-logo-white.png.asset.json";
import diktiLogo from "@/assets/dikti-logo-t.png.asset.json";
import bimaAsset from "@/assets/bima-logo-full.png.asset.json";
import tutwuriLogo from "@/assets/tutwuri-logo-t.png.asset.json";

const logos = [
  { src: duLogo.url, alt: "Pesantren Daarul 'Uluum Lido" },
  { src: yayasanLogo.url, alt: "Yayasan Salsabila Lido" },
  { src: trisaktiLogo.url, alt: "Universitas Trisakti" },
  { src: diktiLogo.url, alt: "Diktisaintek Berdampak" },
  { src: bimaAsset.url, alt: "BiMA" },
  { src: tutwuriLogo.url, alt: "Tut Wuri Handayani" },
];

const platformLinks = [
  { to: "/jobs", label: "Lowongan Kerja" },
  { to: "/alumni", label: "Database Alumni" },
  { to: "/partners", label: "Perusahaan Mitra" },
  { to: "/events", label: "Event Karier" },
];

const infoLinks = [
  { to: "/tentang", label: "Tentang Kami" },
  { to: "/tentang#faq", label: "FAQ" },
  { to: "/tentang#kontak", label: "Kontak" },
];

const socials = [
  { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: Youtube, href: "https://youtube.com", label: "YouTube" },
  { icon: MessageCircle, href: "https://wa.me/6281234567890", label: "WhatsApp" },
];

const BrandText = ({ centered = false }: { centered?: boolean }) => (
  <div className={centered ? "text-center" : ""}>
    <h3 className="font-heading font-bold text-background text-xl md:text-2xl">
      Career Center <span className="text-primary">PEDULI</span>
    </h3>
    <p className="text-xs md:text-sm text-background/60 mt-1.5 max-w-sm mx-auto">
      Platform karier terpadu untuk santri, alumni, dan perusahaan mitra.
    </p>
  </div>
);

const LinkList = ({ items }: { items: { to: string; label: string }[] }) => (
  <ul className="flex flex-col gap-2 text-xs md:text-sm">
    {items.map((l) => (
      <li key={l.to + l.label} className="flex items-start gap-2">
        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
        <Link to={l.to} className="hover:text-primary transition-colors">
          {l.label}
        </Link>
      </li>
    ))}
  </ul>
);

const ContactBlock = () => (
  <div className="flex flex-col gap-2 text-xs md:text-sm">
    <p className="flex items-center gap-2 break-all">
      <Mail className="h-4 w-4 text-primary shrink-0" />
      info@careercenter-peduli.id
    </p>
    <p className="flex items-center gap-2">
      <Phone className="h-4 w-4 text-primary shrink-0" />
      +62 812 3456 7890
    </p>
  </div>
);

const Socials = ({ centered = false }: { centered?: boolean }) => (
  <div className={`flex gap-2.5 ${centered ? "justify-center" : ""}`}>
    {socials.map((s) => (
      <a
        key={s.label}
        href={s.href}
        target="_blank"
        rel="noreferrer"
        aria-label={s.label}
        className="h-9 w-9 rounded-full border border-background/25 flex items-center justify-center text-background/80 hover:text-primary hover:border-primary transition-colors"
      >
        <s.icon className="h-4 w-4" />
      </a>
    ))}
  </div>
);

const LogoRow = () => (
  <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 lg:justify-start">
    {logos.map((l) => (
      <img key={l.alt} src={l.src} alt={l.alt} className="h-11 md:h-12 w-auto object-contain" />
    ))}
  </div>
);

const Footer = () => (
  <footer className="bg-foreground text-background/80 pt-8 pb-24 md:pt-10 md:pb-14">
    <div className="container mx-auto px-4">
      {/* Desktop */}
      <div className="hidden lg:grid grid-cols-[1.4fr_1fr_1fr_1.2fr] gap-8">
        <div className="pr-6">
          <LogoRow />
          <div className="mt-4">
            <BrandText />
          </div>
        </div>
        <div className="lg:border-l lg:border-background/10 lg:pl-8">
          <h4 className="font-heading font-semibold text-background mb-3">Platform</h4>
          <LinkList items={platformLinks} />
        </div>
        <div>
          <h4 className="font-heading font-semibold text-background mb-3">Informasi</h4>
          <LinkList items={infoLinks} />
        </div>
        <div>
          <h4 className="font-heading font-semibold text-background mb-3">Kontak</h4>
          <ContactBlock />
          <div className="mt-4">
            <Socials />
          </div>
        </div>
      </div>

      {/* Tablet */}
      <div className="hidden md:block lg:hidden">
        <div className="flex flex-col items-center gap-4">
          <LogoRow />
          <BrandText centered />
        </div>
        <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-background/10">
          <div>
            <h4 className="font-heading font-semibold text-background mb-3">Platform</h4>
            <LinkList items={platformLinks} />
          </div>
          <div>
            <h4 className="font-heading font-semibold text-background mb-3">Informasi</h4>
            <LinkList items={infoLinks} />
          </div>
          <div>
            <h4 className="font-heading font-semibold text-background mb-3">Kontak</h4>
            <ContactBlock />
            <div className="mt-4">
              <Socials />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="flex flex-col items-center gap-4">
          <LogoRow />
          <BrandText centered />
        </div>
        <Accordion type="multiple" className="mt-5">
          <AccordionItem value="platform" className="border-background/10">
            <AccordionTrigger className="text-background hover:no-underline py-3">
              <span className="flex items-center gap-2 font-heading font-semibold text-sm">
                <Briefcase className="h-4 w-4 text-primary" /> Platform
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <LinkList items={platformLinks} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="informasi" className="border-background/10">
            <AccordionTrigger className="text-background hover:no-underline py-3">
              <span className="flex items-center gap-2 font-heading font-semibold text-sm">
                <Info className="h-4 w-4 text-primary" /> Informasi
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <LinkList items={infoLinks} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="kontak" className="border-background/10">
            <AccordionTrigger className="text-background hover:no-underline py-3">
              <span className="flex items-center gap-2 font-heading font-semibold text-sm">
                <Phone className="h-4 w-4 text-primary" /> Kontak
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <ContactBlock />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="py-4">
          <Socials centered />
        </div>
      </div>

      <div className="border-t border-background/10 mt-6 pt-4 text-center text-[11px] md:text-sm text-background/40">
        © 2026 Smart Career Center PEDULI.
      </div>
    </div>
  </footer>
);

export default Footer;
