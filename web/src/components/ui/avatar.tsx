import { useEffect, useMemo, useState } from "react";
import { Image } from "@/components/ui/image";
import { cn, getAvatarColor } from "@/lib/utils";

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  textClassName?: string;
  alt?: string;
};

const isUsableImageSrc = (value?: string | null) => {
  if (!value || typeof value !== "string") {
    return false;
  }

  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  const lower = normalized.toLowerCase();
  if (["null", "undefined", "none", "n/a", "na"].includes(lower)) {
    return false;
  }

  return true;
};

export const Avatar = ({
  src,
  name,
  className,
  imageClassName,
  fallbackClassName,
  textClassName,
  alt,
}: AvatarProps) => {
  const normalizedSrc = useMemo(() => (typeof src === "string" ? src.trim() : ""), [src]);
  const shouldAttemptImage = isUsableImageSrc(normalizedSrc);
  const [hasImageError, setHasImageError] = useState(false);

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Avatar]', { src: normalizedSrc, name, shouldAttemptImage, hasImageError });
  }

  useEffect(() => {
    setHasImageError(false);
  }, [normalizedSrc]);

  const showImage = shouldAttemptImage && !hasImageError;
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {showImage ? (
        <Image
          src={normalizedSrc}
          alt={alt || name || "Avatar"}
          fill
          className={cn("object-cover", imageClassName)}
          onError={() => setHasImageError(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center bg-gradient-to-br text-white",
            getAvatarColor(name),
            fallbackClassName
          )}
        >
          <span className={cn("font-bold", textClassName)}>{initial}</span>
        </div>
      )}
    </div>
  );
};
