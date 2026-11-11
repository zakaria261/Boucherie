import Image from "next/image";

/**
 * Photo optimisée : servie en AVIF/WebP, à la taille de l'écran (srcset), et
 * chargée en différé hors écran. width/height ne donnent que les proportions
 * de départ : la mise en page réelle vient du CSS (aspect-ratio, object-fit).
 */
export function Photo({
  src,
  alt = "",
  sizes,
  preload = false,
  className,
}: {
  src: string;
  alt?: string;
  sizes: string;
  preload?: boolean;
  className?: string;
}) {
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={900}
      sizes={sizes}
      preload={preload}
      loading={preload ? "eager" : "lazy"}
      className={className}
    />
  );
}
