import miaPhoto from "@/assets/perfil-mia.jpg.asset.json";

export function MiaAvatar({ className = "size-7" }: { className?: string }) {
  return (
    <img
      src={miaPhoto.url}
      alt="MIA"
      className={`${className} shrink-0 rounded-full object-cover`}
      loading="lazy"
    />
  );
}
