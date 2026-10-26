import { useState, type CSSProperties } from "react";
import { Music2, Play } from "lucide-react";
import { cn, gradientFor } from "../utils";

interface CoverProps {
  src?: string | null;
  alt?: string;
  seed?: string;
  className?: string;
  rounded?: boolean;
  playBadge?: boolean;
  style?: CSSProperties;
  loading?: "lazy" | "eager";
}

export function Cover({
  src,
  alt = "",
  seed = "sona",
  className,
  rounded = true,
  playBadge = false,
  style,
  loading = "lazy",
}: CoverProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  return (
    <div
      className={cn("cover", rounded && "cover--rounded", className)}
      style={{ background: gradientFor(seed), ...style }}
    >
      {showImage ? (
        <img
          src={src || ""}
          alt={alt}
          loading={loading}
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="cover__fallback" aria-hidden="true">
          <span className="cover__rings" />
          <Music2 size={28} />
          <span className="cover__initial">{seed.slice(0, 1).toUpperCase()}</span>
        </div>
      )}
      {playBadge && (
        <span className="cover__play-badge" aria-hidden="true">
          <Play fill="currentColor" size={18} />
        </span>
      )}
      <span className="cover__grain" aria-hidden="true" />
    </div>
  );
}

interface CollageProps {
  images?: string[];
  cover?: string | null;
  seed?: string;
  className?: string;
  alt?: string;
}

export function PlaylistArtwork({
  images = [],
  cover,
  seed = "playlist",
  className,
  alt = "",
}: CollageProps) {
  const items = (cover ? [cover] : images).filter(Boolean).slice(0, 4);
  if (items.length === 0) {
    return <Cover seed={seed} alt={alt} className={className} />;
  }
  if (items.length === 1) {
    return <Cover src={items[0]} alt={alt} seed={seed} className={className} />;
  }
  return (
    <div className={cn("collage", className)} style={{ background: gradientFor(seed) }}>
      {Array.from({ length: 4 }).map((_, index) => {
        const image = items[index % items.length];
        return (
          <div key={index} className="collage__cell">
            <img src={image} alt="" loading="lazy" draggable={false} />
          </div>
        );
      })}
      <span className="cover__grain" aria-hidden="true" />
    </div>
  );
}
