import { useState } from "react";

interface BrandImageSlotProps {
  src: string;
  alt: string;
  label: string;
  className?: string;
}

export function BrandImageSlot({ src, alt, label, className = "" }: BrandImageSlotProps) {
  const [unavailable, setUnavailable] = useState(false);
  return (
    <span className={`brand-image-slot ${className}`}>
      <img src={src} alt={alt} loading="lazy" onError={() => setUnavailable(true)} className={unavailable ? "brand-image-hidden" : undefined} />
      {unavailable && <span className="brand-image-fallback" aria-hidden="true">{label}</span>}
    </span>
  );
}
