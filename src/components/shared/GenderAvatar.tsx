import { User, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  gender?: string | null;
  className?: string;
  iconClassName?: string;
};

const isFemale = (g?: string | null) => {
  const v = (g || "").toLowerCase().trim();
  return v.startsWith("p") || v.startsWith("f") || v === "wanita" || v === "female";
};

/** Ikon profil orang berdasarkan jenis kelamin (laki-laki / perempuan). */
const GenderAvatar = ({ gender, className, iconClassName }: Props) => {
  const female = isFemale(gender);
  const Icon = female ? UserRound : User;
  return (
    <div
      aria-label={female ? "Foto profil perempuan" : "Foto profil laki-laki"}
      className={cn(
        "rounded-full flex items-center justify-center shrink-0 border",
        female
          ? "bg-pink-500/10 text-pink-600 border-pink-500/20"
          : "bg-primary/10 text-primary border-primary/20",
        className ?? "h-10 w-10",
      )}
    >
      <Icon className={cn(iconClassName ?? "h-5 w-5")} strokeWidth={2.2} />
    </div>
  );
};

export default GenderAvatar;
