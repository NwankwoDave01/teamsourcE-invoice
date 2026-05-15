import { BRAND } from "@/lib/brand";

type Variant = "tenant" | "admin" | "auth";
type Size = "sm" | "md";

interface BrandMarkProps {
  variant?: Variant;
  size?: Size;
  showText?: boolean;
  subtitle?: string;
}

const sizeMap = {
  sm: { box: "h-8 w-8", text: "text-[11px]", title: "text-sm" },
  md: { box: "h-9 w-9", text: "text-xs", title: "text-lg" },
};

export function BrandMark({
  variant = "tenant",
  size = "sm",
  showText = true,
  subtitle,
}: BrandMarkProps) {
  const s = sizeMap[size];
  const isAdmin = variant === "admin";
  const label = isAdmin ? BRAND.adminName : BRAND.name;
  const sub =
    subtitle ??
    (isAdmin ? "Platform Console" : variant === "tenant" ? BRAND.shortTagline : undefined);

  const tileClass = isAdmin
    ? "bg-success shadow-elegant-md"
    : "bg-gradient-primary shadow-elegant-md";
  const monogramClass = isAdmin ? "text-success-foreground" : "text-primary-foreground";

  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex ${s.box} items-center justify-center rounded-md ${tileClass}`}>
        <span className={`font-bold tracking-tight ${monogramClass} ${s.text}`}>
          {BRAND.monogram}
        </span>
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-semibold ${s.title} text-sidebar-primary-foreground`}>
            {label}
          </span>
          {sub && (
            <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
              {sub}
            </span>
          )}
        </div>
      )}
    </div>
  );
}