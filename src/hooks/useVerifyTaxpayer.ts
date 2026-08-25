export interface TaxpayerVerificationResult {
  ok: boolean;
  message?: string;
  data?: {
    name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    email: string;
    phone?: string;
    lga?: string;
    postcode?: string;
    country_code?: string;
    rc_number?: string;
  };
}

export function useVerifyTaxpayer() {
  const verifyTaxpayer = async (tin: string): Promise<TaxpayerVerificationResult> => {
    if (!tin || !tin.trim()) {
      return { ok: false, message: "TIN is required" };
    }

    return {
      ok: true,
      message: "TIN captured for NRS invoice validation",
    };
  };

  return { verifyTaxpayer, isValidating: false };
}
