import { Link } from "react-router-dom";
import duLogo from "@/assets/daarul-uluum-logo.png.asset.json";
import yayasanLogo from "@/assets/yayasan-salsabila-logo.png.asset.json";

const Footer = () => (
  <footer className="bg-foreground text-background/80 section-padding">
    <div className="container mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <img src={duLogo.url} alt="Daarul Uluum Lido" className="h-10 w-10 object-contain" />
            <img src={yayasanLogo.url} alt="Yayasan Salsabila Lido" className="h-10 w-10 object-contain rounded" />
            <span className="font-heading font-bold text-background">Career Center PEDULI</span>
          </div>
          <p className="text-sm text-background/60">Platform karier terpadu untuk santri, alumni, dan perusahaan mitra.</p>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-background mb-3">Platform</h4>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/jobs" className="hover:text-primary transition-colors">Lowongan Kerja</Link>
            <Link to="/alumni" className="hover:text-primary transition-colors">Database Alumni</Link>
            <Link to="/partners" className="hover:text-primary transition-colors">Perusahaan Mitra</Link>
            <Link to="/events" className="hover:text-primary transition-colors">Event Karier</Link>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-background mb-3">Informasi</h4>
          <div className="flex flex-col gap-2 text-sm">
            <a href="#" className="hover:text-primary transition-colors">Tentang Kami</a>
            <a href="#" className="hover:text-primary transition-colors">FAQ</a>
            <a href="#" className="hover:text-primary transition-colors">Kontak</a>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-background mb-3">Kontak</h4>
          <div className="flex flex-col gap-2 text-sm">
            <p>info@careercenter-peduli.id</p>
            <p>+62 812 3456 7890</p>
          </div>
        </div>
      </div>
      <div className="border-t border-background/10 pt-6 text-center text-sm text-background/40">
        © 2026 Smart Career Center PEDULI. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
