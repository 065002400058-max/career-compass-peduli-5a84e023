import { Link } from "react-router-dom";
import duLogo from "@/assets/daarul-uluum-logo.png.asset.json";
import yayasanLogo from "@/assets/yayasan-salsabila-logo.png.asset.json";
import trisaktiLogo from "@/assets/trisakti-logo.png.asset.json";
import diktiLogo from "@/assets/diktisaintek-logo.png.asset.json";

const Footer = () => (
  <footer className="bg-foreground text-background/80 py-5 md:py-10">
    <div className="container mx-auto px-4">
      <div className="flex items-center gap-2 mb-3">
        <img src={duLogo.url} alt="Daarul Uluum Lido" className="h-8 w-8 object-contain" />
        <img src={yayasanLogo.url} alt="Yayasan Salsabila Lido" className="h-8 w-8 object-contain rounded" />
        <img src={trisaktiLogo.url} alt="Universitas Trisakti" className="h-8 w-8 object-contain" />
        <img src={diktiLogo.url} alt="Diktisaintek Berdampak" className="h-8 w-8 object-contain" />
        <span className="font-heading font-bold text-background text-sm">Career Center PEDULI</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4 mb-4">
        <p className="col-span-2 md:col-span-1 text-xs md:text-sm text-background/60">
          Platform karier terpadu untuk santri, alumni, dan perusahaan mitra.
        </p>
        <div>
          <h4 className="font-heading font-semibold text-background text-sm mb-1.5">Platform</h4>
          <div className="flex flex-col gap-1 text-xs md:text-sm">
            <Link to="/jobs" className="hover:text-primary transition-colors">Lowongan Kerja</Link>
            <Link to="/alumni" className="hover:text-primary transition-colors">Database Alumni</Link>
            <Link to="/partners" className="hover:text-primary transition-colors">Perusahaan Mitra</Link>
            <Link to="/events" className="hover:text-primary transition-colors">Event Karier</Link>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-background text-sm mb-1.5">Informasi</h4>
          <div className="flex flex-col gap-1 text-xs md:text-sm">
            <a href="#" className="hover:text-primary transition-colors">Tentang Kami</a>
            <a href="#" className="hover:text-primary transition-colors">FAQ</a>
            <a href="#" className="hover:text-primary transition-colors">Kontak</a>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-background text-sm mb-1.5">Kontak</h4>
          <div className="flex flex-col gap-1 text-xs md:text-sm break-words">
            <p>info@careercenter-peduli.id</p>
            <p>+62 812 3456 7890</p>
          </div>
        </div>
      </div>
      <div className="border-t border-background/10 pt-3 text-center text-[11px] md:text-sm text-background/40">
        © 2026 Smart Career Center PEDULI.
      </div>
    </div>
  </footer>
);

export default Footer;
