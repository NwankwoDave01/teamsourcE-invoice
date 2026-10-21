export const formatNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

export const formatCurrency = (n: number, currency: string = "NGN", decimals: number = 2) => {
  const code = (currency || "NGN").toUpperCase().trim();
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  } catch {
    return `${code} ${n.toLocaleString("en-NG", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }
};

export const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-NG").format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
