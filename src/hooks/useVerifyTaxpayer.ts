import { useState } from "react";
import { useCurrentCompany } from "./useCompanyData";

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

const MOCK_TAXPAYERS = [
  {
    tin: "1234567890",
    name: "Dave's Enterprise Solution Ltd",
    address_line1: "78 Dave's Tech Avenue",
    address_line2: "Penthouse Suite C",
    city: "Lagos",
    state: "Lagos",
    email: "dave@davebusiness.com",
    phone: "+234 809 111 2222",
    lga: "Ikeja",
    postcode: "100001",
    country_code: "NG",
    rc_number: "RC-123456",
  },
  {
    tin: "NG-44192011",
    name: "Adeola Ventures",
    address_line1: "88 Adeola Commercial Street",
    address_line2: "Suite 12, Ground Floor",
    city: "Lagos",
    state: "Lagos",
    email: "billing@adeolaventures.ng",
    phone: "+234 802 145 9921",
    lga: "Surulere",
    postcode: "101241",
    country_code: "NG",
    rc_number: "RC-441920",
  },
  {
    tin: "57d0935f-5328-4476-9fbf-100c616e4358",
    name: "Mock Corporate Taxpayer Ltd",
    address_line1: "123 Mock Sandbox Lane",
    address_line2: "Block B, Suite 4",
    city: "Abuja",
    state: "FCT",
    email: "contact@mocktaxpayer.ng",
    phone: "+234 800 662 5829",
    lga: "Municipal",
    postcode: "900001",
    country_code: "NG",
    rc_number: "RC-998877",
  }
];

export function useVerifyTaxpayer() {
  const { data: company } = useCurrentCompany();
  const [isValidating, setIsValidating] = useState(false);

  const verifyTaxpayer = async (tin: string): Promise<TaxpayerVerificationResult> => {
    if (!tin || !tin.trim()) {
      return { ok: false, message: "TIN is required for verification" };
    }

    setIsValidating(true);
    try {
      const environment = company?.nrs_environment ?? "sandbox";

      if (environment === "sandbox") {
        // Bypass live check and validate against mock array
        await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate delay
        const match = MOCK_TAXPAYERS.find((t) => t.tin.trim() === tin.trim());
        if (match) {
          return { ok: true, data: match };
        } else {
          return { ok: false, message: "Taxpayer TIN not registered in sandbox database." };
        }
      } else {
        // Production: fire secure endpoint check
        const baseUrl = company?.nrs_production_base_url || "https://einvoice.nrs.gov.ng";
        const apiKey = company?.nrs_api_key || "";
        const url = `${baseUrl.replace(/\/+$/, "")}/api/v1/utilities/verify-tin/${encodeURIComponent(tin.trim())}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Verification failed with status ${response.status}: ${errorText}`);
        }

        const payload = await response.json();
        return { ok: true, data: payload };
      }
    } catch (e: any) {
      console.error("TIN Verification Error:", e);
      return { ok: false, message: e.message || "TIN verification service unavailable" };
    } finally {
      setIsValidating(false);
    }
  };

  return { verifyTaxpayer, isValidating };
}
