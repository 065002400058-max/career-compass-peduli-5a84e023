import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <main className="flex min-h-[70vh] items-center justify-center bg-background px-4">
    <div className="text-center">
      <p className="font-poppins text-6xl font-bold text-primary">404</p>
      <h1 className="mt-3 font-poppins text-2xl font-semibold text-foreground">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-2 text-muted-foreground">
        Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">
          <Home className="mr-2 h-4 w-4" />
          Kembali ke Beranda
        </Link>
      </Button>
    </div>
  </main>
);

export default NotFound;
