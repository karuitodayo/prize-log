import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getPhotoBlob } from "../utils/photoStore";

interface PhotoThumbnailProps {
  photoId: string | null;
  className?: string;
  fallback?: ReactNode;
}

export function PhotoThumbnail({
  photoId,
  className,
  fallback,
}: PhotoThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);

    if (photoId) {
      getPhotoBlob(photoId).then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      });
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={className}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    );
  }

  return <>{fallback ?? null}</>;
}
