import { cn } from "@/lib/utils";
import maleAvatar from "@/assets/avatar-male.png";
import femaleAvatar from "@/assets/avatar-female.png";

type Props = {
  gender?: string | null;
  className?: string;
  /** Dipertahankan untuk kompatibilitas pemanggilan lama. */
  iconClassName?: string;
};

const isFemale = (g?: string | null) => {
  const v = (g || "").toLowerCase().trim();
  return v.startsWith("p") || v.startsWith("f") || v === "wanita" || v === "female";
};

/** Foto profil (ilustrasi) berdasarkan jenis kelamin: laki-laki / perempuan. */
const GenderAvatar = ({ gender, className }: Props) => {
  const female = isFemale(gender);
  return (
    <div
      className={cn(
        "rounded-full overflow-hidden shrink-0 border bg-muted",
        female ? "border-pink-500/30" : "border-primary/30",
        className ?? "h-10 w-10",
      )}
    >
      <img
        src={female ? femaleAvatar : maleAvatar}
        alt={female ? "Foto profil alumni perempuan" : "Foto profil alumni laki-laki"}
        loading="lazy"
        width={512}
        height={512}
        className="h-full w-full object-cover"
      />
    </div>
  );
};

export default GenderAvatar;
