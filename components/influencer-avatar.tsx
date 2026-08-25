import { cn } from "@/lib/utils";

export function InfluencerAvatar({
  nome,
  fotoUrl,
  className,
}: {
  nome: string;
  fotoUrl?: string;
  className?: string;
}) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt={nome}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary",
        className
      )}
    >
      {nome.charAt(0).toUpperCase()}
    </div>
  );
}
