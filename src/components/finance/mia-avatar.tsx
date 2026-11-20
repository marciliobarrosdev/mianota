export function MiaAvatar({ className = "size-7" }: { className?: string }) {
  return (
    <img
      src="/perfil-mia.png"
      alt="MIA"
      className={`${className} shrink-0 rounded-full object-cover`}
      loading="lazy"
    />
  );
}
