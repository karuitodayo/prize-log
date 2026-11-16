import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getIndoorMapBlob } from "../utils/indoorMapStore";

interface IndoorMapImageProps {
  imageId: string | null;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMissing?: () => void;
  children?: ReactNode;
}

// 店内マップ画像を元の縦横比のまま、余白なしで表示する。
// width:100%・height:autoで表示するため、ラッパーの描画領域＝画像の描画領域になり、
// ピンの%座標計算（クリック位置 ÷ ラッパーのサイズ）に余白分の補正が不要になる。
export function IndoorMapImage({
  imageId,
  className,
  onClick,
  onMissing,
  children,
}: IndoorMapImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const onMissingRef = useRef(onMissing);
  onMissingRef.current = onMissing;

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);

    if (imageId) {
      getIndoorMapBlob(imageId).then((blob) => {
        if (cancelled) return;
        if (!blob) {
          onMissingRef.current?.();
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      });
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  if (!url) {
    return null;
  }

  return (
    <div
      className={`indoor-map-image-wrap${className ? ` ${className}` : ""}`}
      onClick={onClick}
    >
      <img src={url} alt="店内マップ" className="indoor-map-image" />
      {children}
    </div>
  );
}

// クリック位置を、クリックされた要素（ラッパーdiv）の描画領域に対する
// 相対座標（0〜100%）に変換する。
export function getRelativeClickPosition(
  e: React.MouseEvent<HTMLElement>
): { x: number; y: number } {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
}
