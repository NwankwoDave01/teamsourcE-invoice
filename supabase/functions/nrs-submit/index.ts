import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import forge from "npm:node-forge@1.3.1";
import QRCode from "npm:qrcode@1.5.4";
import { resolveNrsBaseUrl } from "../_shared/nrsBaseUrl.ts";
import {
  createNrsMonetaryTotals,
  validateNrsInvoiceAmounts,
  type InvoiceAmountHeader,
  type InvoiceAmountLine,
} from "../_shared/invoiceMonetaryTotals.ts";

const cors = {
  "Access-Control-Allow-Origin": "https://e-invoicing.teamsource.net",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: cors,
  });

const VALID_TAX = new Set(["S", "Z", "E", "O"]);

const TAX_ID = {
  S: "STANDARD_VAT",
  Z: "ZERO_RATED",
  E: "VAT_EXEMPT",
  O: "OUT_OF_SCOPE",
} as const;

const NRS_INVOICE_TYPE_CODES = new Set([
  "380", "381", "384", "385", "386", "388", "389", "390", "392", "393",
  "394", "395", "396", "397", "399", "400", "402", "404", "406", "408",
]);

const TYPE: Record<string, string> = {
  commercial: "381",
  commercial_invoice: "381",
  credit_note: "380",
  debit_note: "384",
  self_billed_invoice: "385",
  factored_invoice: "386",
  statement_of_account: "388",
  purchase_order: "389",
  proforma: "390",
  proforma_invoice: "390",
  consignment_invoice: "392",
  self_billed_credit_note: "393",
  self_billed_invoice_debit_note: "394",
  credit_note_request: "395",
  invoice_request: "396",
  final_settlement: "397",
  bill_of_lading: "399",
  waybill: "400",
  shipping_instructions: "402",
  certificate_of_origin: "404",
  customs_declaration: "406",
  packing_list: "408",
};

type InvoiceTypeCodeResult =
  | { valid: true; code: string }
  | { valid: false; reason: "missing" | "unsupported" };

function normalizeInvoiceTypeCode(value: unknown): InvoiceTypeCodeResult {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) return { valid: false, reason: "missing" };
  if (/^\d+$/.test(raw)) {
    return NRS_INVOICE_TYPE_CODES.has(raw)
      ? { valid: true, code: raw }
      : { valid: false, reason: "unsupported" };
  }
  const code = TYPE[raw.toLowerCase()];
  return code
    ? { valid: true, code }
    : { valid: false, reason: "unsupported" };
}

type NrsRow = Record<string, unknown>;
type NrsInvoiceRow = NrsRow & InvoiceAmountHeader;
type NrsInvoiceLine = NrsRow & InvoiceAmountLine;

const omit = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value
      .map(omit)
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, omit(item)])
        .filter(([, item]) => item !== undefined),
    );
  }

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  return value;
};

const round = (value: number) =>
  Math.round(value * 100) / 100;

/**
 * NRS IRN:
 *
 * Invoice Number + Service ID + YYYYMMDD
 *
 * The invoice-number component supplied to the IRN
 * must be alphanumeric.
 */
function toNrsInvoiceReference(number: unknown) {
  const normalized = String(number ?? "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();

  if (!normalized) {
    throw new Error(
      "Invoice number must contain at least one letter or number for NRS IRN generation",
    );
  }

  return normalized;
}

function strictIrn(
  number: string,
  serviceId: string,
  date: string,
) {
  const invoiceReference =
    toNrsInvoiceReference(number);

  const normalizedServiceId =
    String(serviceId ?? "").trim();

  if (
    !/^[A-Za-z0-9]{8}$/.test(
      normalizedServiceId,
    )
  ) {
    throw new Error(
      "NRS Service ID must be exactly 8 alphanumeric characters",
    );
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    throw new Error(
      "Issue date must be YYYY-MM-DD",
    );
  }

  return `${invoiceReference}-${normalizedServiceId.toUpperCase()}-${date.replaceAll(
    "-",
    "",
  )}`;
}

function party(
  source: NrsRow | null,
  fallback: string,
) {
  // Match the NRS party shape used in the known-working Postman request.
  // Do not add database UUIDs as NRS party/address identifiers unless the
  // NRS schema explicitly requires them for this endpoint.
  return omit({
    party_name:
      source?.legal_name ??
      source?.name ??
      fallback,
    tin: String(source?.tin ?? "").trim() || undefined,
    email: source?.email ?? null,
    telephone: source?.phone ?? null,
    business_description:
      source?.business_description ??
      source?.industry ??
      null,
    postal_address: {
      street_name: source?.address_line1 ?? null,
      city_name: source?.city ?? null,
      postal_zone: source?.postcode ?? null,
      lga: source?.lga ?? null,
      state: source?.state ?? null,
      country: String(source?.country_code ?? "NG").toUpperCase(),
    },
  });
}

function isRealIsoDate(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateInput(
  invoice: NrsInvoiceRow,
  lines: NrsInvoiceLine[],
  company: NrsRow | null,
  customer: NrsRow | null,
) {
  const errors: string[] = [];

  if (!company?.nrs_business_id) errors.push("NRS Business ID is required");
  if (!company?.nrs_service_id) errors.push("NRS Service ID is required");

  if (!invoice.number || !toNrsInvoiceReference(invoice.number)) {
    errors.push("Invoice number must contain at least one letter or number");
  }

  if (!isRealIsoDate(invoice.issue_date)) {
    errors.push("Issue date must be a real calendar date in YYYY-MM-DD format");
  }
  if (invoice.due_date != null && invoice.due_date !== "" && !isRealIsoDate(invoice.due_date)) {
    errors.push("Due date must be a real calendar date in YYYY-MM-DD format");
  }
  if (invoice.supply_date != null && invoice.supply_date !== "" && !isRealIsoDate(invoice.supply_date)) {
    errors.push("Supply date must be a real calendar date in YYYY-MM-DD format");
  }

  if (!company?.tin) errors.push("Supplier TIN is required");
  if (!company?.email) errors.push("Supplier email is required");
  if (!customer?.tin) errors.push("Customer TIN is required");
  if (!customer?.email) errors.push("Customer email is required");
  if (!lines.length) errors.push("At least one invoice line is required");

  for (const [index, line] of lines.entries()) {
    const category = String(line.tax_category ?? "S").toUpperCase();
    const quantity = Number(line.qty);
    const unitPrice = Number(line.unit_price);
    const discount = Number(line.discount_amount ?? 0);
    const taxRate = Number(line.tax_rate ?? 0);

    if (!VALID_TAX.has(category)) {
      errors.push(`Line ${index + 1}: tax_category must be S|Z|E|O (got ${category})`);
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`Line ${index + 1}: quantity must be a finite number greater than zero`);
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      errors.push(`Line ${index + 1}: unit price must be a finite, non-negative number`);
    }
    if (!Number.isFinite(discount) || discount < 0) {
      errors.push(`Line ${index + 1}: discount must be a finite, non-negative number`);
    } else if (Number.isFinite(quantity) && quantity > 0 && Number.isFinite(unitPrice) && unitPrice >= 0 &&
      discount > round(quantity * unitPrice) + 0.001) {
      errors.push(`Line ${index + 1}: discount cannot exceed the gross line amount`);
    }
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      errors.push(`Line ${index + 1}: tax rate must be a finite number between 0 and 100`);
    }
    if (!String(line.description ?? "").trim()) {
      errors.push(`Line ${index + 1}: description is required`);
    }
  }

  errors.push(...validateNrsInvoiceAmounts(invoice, lines));

  return errors;
}

function buildPayload(
  invoice: NrsInvoiceRow,
  lines: NrsInvoiceLine[],
  company: NrsRow | null,
  customer: NrsRow | null,
  irn: string,
  invoiceTypeCode: string,
) {
  const builtLines = lines.map(
    (line, index) => {
      const quantity = Number(
        line.qty || 0,
      );

      const unitPrice = Number(
        line.unit_price || 0,
      );

      const discount = Number(
        line.discount_amount || 0,
      );

      const net = round(
        quantity * unitPrice -
          discount,
      );

      return {
        position:
          line.position ?? index,

        // NRS requires HSN in ####.## format.
        hsn_code: (() => {
          const stored = String(
            line.hsn_code ?? line.item_classification_code ?? "",
          ).trim();
          if (/^\d{4}\.\d{2}$/.test(stored)) return stored;
          if (/^\d{4}$/.test(stored)) return stored + ".00";
          if (/rice/i.test(String(line.description ?? ""))) return "1006.30";
          return undefined;
        })(),

        // NRS requires product_category on each invoice line.
        product_category: (() => {
          const stored = String(line.product_category ?? "").trim();
          if (/rice/i.test(String(line.description ?? "")) &&
              /growing of rice/i.test(stored)) {
            return "Cereals; rice";
          }
          return stored || line.description;
        })(),

        discount_rate:
          quantity * unitPrice
            ? round(
                (discount /
                  (quantity *
                    unitPrice)) *
                  100,
              )
            : 0,

        discount_amount:
          discount,

        fee_rate: 0,

        fee_amount: 0,

        invoiced_quantity:
          quantity,

        line_extension_amount:
          net,

        item: {
          name: line.description,

          description:
            line.description,

          sellers_item_identification:
            line.line_uuid ??
            line.id,
        },

        price: {
          price_amount:
            unitPrice,

          base_quantity: 1,

          price_unit: String(
            line.unit_code || "EA",
          ).trim().toUpperCase().slice(0, 3),
        },
      };
    },
  );

  const subtotal = round(
    builtLines.reduce(
      (sum, line) =>
        sum +
        line.line_extension_amount,
      0,
    ),
  );

  const taxTotal = round(
    lines.reduce((sum, line) => {
      const category =
        String(
          line.tax_category ||
            "S",
        ).toUpperCase();

      const net = round(
        Number(line.qty || 0) *
          Number(
            line.unit_price || 0,
          ) -
          Number(
            line.discount_amount ||
              0,
          ),
      );

      return (
        sum +
        (category === "S"
          ? round(
              (net *
                Number(
                  line.tax_rate || 0,
                )) /
                100,
            )
          : 0)
      );
    }, 0),
  );

  const taxGroups: Record<string, {
    taxable_amount: number;
    tax_amount: number;
    tax_category: { id: string; percent: number };
  }> = {};

  for (const line of lines) {
    const category =
      String(
        line.tax_category || "S",
      ).toUpperCase();

    const configuredRate = Number(
      line.tax_rate || 0,
    );
    // Non-standard tax categories must not inherit a standard VAT rate.
    const rate = category === "S" ? configuredRate : 0;

    const net = round(
      Number(line.qty || 0) *
        Number(
          line.unit_price || 0,
        ) -
        Number(
          line.discount_amount ||
            0,
        ),
    );

    const tax =
      category === "S"
        ? round(
            (net * rate) / 100,
          )
        : 0;

    const key =
      `${category}:${rate}`;

    taxGroups[key] ??= {
      taxable_amount: 0,
      tax_amount: 0,
      tax_category: {
        id: TAX_ID[
          category as keyof typeof TAX_ID
        ],
        percent: rate,
      },
    };

    // Keep the taxable base for zero-rated, exempt and out-of-scope
    // lines visible in their own category subtotal; their tax remains zero.
    taxGroups[key]
      .taxable_amount = round(
      taxGroups[key]
        .taxable_amount +
        net,
    );

    taxGroups[key].tax_amount =
      round(
        taxGroups[key]
          .tax_amount + tax,
      );
  }

  return omit({
    business_id:
      company.nrs_business_id,

    irn,

    issue_date:
      invoice.issue_date,

    due_date:
      invoice.due_date,

    issue_time:
      invoice.issue_time
        ? String(
            invoice.issue_time,
          ).slice(0, 8)
        : undefined,

    invoice_type_code: invoiceTypeCode,

    invoice_kind:
      invoice.invoice_kind ??
      invoice.transaction_type ??
      "B2B",

    payment_status:
      "PENDING",

    note:
      invoice.notes,

    tax_point_date:
      invoice.supply_date ??
      invoice.issue_date,

    document_currency_code:
      String(
        invoice.currency || "NGN",
      ).toUpperCase(),

    tax_currency_code:
      String(
        invoice.tax_currency_code ??
          invoice.currency ??
          "NGN",
      ).toUpperCase(),

    accounting_cost:
      String(
        invoice.accounting_cost ??
          subtotal,
      ),

    buyer_reference:
      invoice.customer_name,

    accounting_supplier_party:
      party(
        company,
        company.name,
      ),

    accounting_customer_party:
      party(
        customer,
        invoice.customer_name,
      ),

    actual_delivery_date:
      invoice.supply_date ??
      invoice.issue_date,

    payment_means:
      invoice.payment_means_code
        ? [
            {
              payment_means_code:
                invoice.payment_means_code,

              payment_due_date:
                invoice.due_date,
            },
          ]
        : undefined,

    payment_terms_note:
      invoice.payment_terms,

    tax_total: [
      {
        tax_amount:
          taxTotal,

        tax_subtotal:
          Object.values(
            taxGroups,
          ),
      },
    ],

    legal_monetary_total:
      createNrsMonetaryTotals(
        subtotal,
        taxTotal,
      ),

    invoice_line:
      builtLines,
  });
}

async function readBody(
  response: Response,
) {
  const text =
    await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text,
    };
  }
}

function getMessage(
  response: unknown,
  fallback: string,
) {
  const responseRecord = response && typeof response === "object" && !Array.isArray(response)
    ? response as Record<string, unknown>
    : null;
  if (
    typeof responseRecord?.message ===
    "string"
  ) {
    return responseRecord.message;
  }

  const errorRecord = responseRecord?.error && typeof responseRecord.error === "object" && !Array.isArray(responseRecord.error)
    ? responseRecord.error as Record<string, unknown>
    : null;
  if (
    typeof errorRecord?.public_message ===
    "string"
  ) {
    return errorRecord.public_message;
  }

  return fallback;
}

function publicPem(
  value: string,
) {
  const normalized =
    value.trim();

  if (
    normalized.includes(
      "BEGIN PUBLIC KEY",
    )
  ) {
    return normalized;
  }

  try {
    return new TextDecoder().decode(
      Uint8Array.from(
        atob(normalized),
        (character) =>
          character.charCodeAt(0),
      ),
    );
  } catch {
    throw new Error(
      "Stored taxpayer public key is not valid PEM/Base64 data",
    );
  }
}

async function generateQr(
  irn: string,
  crypto: { certificate: string; public_key: string },
) {
  const timestamp =
    Math.floor(
      Date.now() / 1000,
    );

  const clearText =
    JSON.stringify({
      irn: `${irn}.${timestamp}`,
      certificate:
        crypto.certificate,
    });

  const publicKey =
    forge.pki.publicKeyFromPem(
      publicPem(
        crypto.public_key,
      ),
    );

  const encrypted =
    publicKey.encrypt(
      forge.util.encodeUtf8(
        clearText,
      ),
      "RSAES-PKCS1-V1_5",
    );

  const encoded =
    btoa(
      encrypted,
    );

  const qr =
    await QRCode.toDataURL(
      encoded,
      {
        errorCorrectionLevel:
          "M",
        margin: 1,
        width: 320,
      },
    );

  return {
    data: encoded,
    qr,
  };
}

Deno.serve(async (request) => {
  if (
    request.method ===
    "OPTIONS"
  ) {
    return new Response("ok", {
      headers: cors,
    });
  }

  let stage = "start";
  let adminDb: ReturnType<typeof createClient> | null = null;
  let attemptId: string | null = null;
  let activeInvoiceId: string | null = null;
  let signingStarted = false;

  try {
    /* -----------------------------------------------
       1. Authenticate application user
    ------------------------------------------------ */

    stage = "authenticate";

    const authorization =
      request.headers.get(
        "Authorization",
      ) ?? "";

    if (
      !authorization.startsWith(
        "Bearer ",
      )
    ) {
      return json(
        {
          ok: false,
          stage,
          error:
            "Unauthorized",
        },
        401,
      );
    }

    const userClient =
      createClient(
        Deno.env.get(
          "SUPABASE_URL",
        )!,
        Deno.env.get(
          "SUPABASE_ANON_KEY",
        )!,
        {
          global: {
            headers: {
              Authorization:
                authorization,
            },
          },
        },
      );

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await userClient.auth.getUser(
        authorization.slice(7),
      );

    if (
      userError ||
      !user
    ) {
      return json(
        {
          ok: false,
          stage,
          error:
            "Unauthorized",
        },
        401,
      );
    }

    /* -----------------------------------------------
       2. Server-side service role
    ------------------------------------------------ */

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    adminDb = db;

    const body =
      await request
        .json()
        .catch(() => ({}));

    const invoiceId =
      body.invoice_id;
    activeInvoiceId = invoiceId ? String(invoiceId) : null;

    if (!invoiceId) {
      return json(
        {
          ok: false,
          stage: "input",
          error:
            "invoice_id is required",
        },
        400,
      );
    }

    /* -----------------------------------------------
       3. Load invoice
    ------------------------------------------------ */

    stage =
      "load_invoice";

    const {
      data: invoice,
      error:
        invoiceError,
    } =
      await db
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .maybeSingle();

    if (invoiceError) {
      throw invoiceError;
    }

    if (!invoice) {
      return json(
        {
          ok: false,
          stage: "authorize_invoice",
          error: "Invoice not found or unavailable",
        },
        404,
      );
    }

    /* -----------------------------------------------
       4. Authorize company
    ------------------------------------------------ */

    stage =
      "authorize_company";

    const {
      data: allowed,
      error:
        authorizationError,
    } =
      await db.rpc(
        "can_manage_invoices",
        {
          _user_id:
            user.id,

          _company_id:
            invoice.company_id,
        },
      );

    if (
      authorizationError
    ) {
      console.error("NRS_SUBMIT_INVOICE_AUTHORIZATION_CHECK_FAILED", {
        error_code: authorizationError.code ?? "unknown",
      });
      return json(
        {
          ok: false,
          stage: "authorize_invoice",
          error: "Invoice not found or unavailable",
        },
        404,
      );
    }

    if (!allowed) {
      return json(
        {
          ok: false,
          stage: "authorize_invoice",
          error: "Invoice not found or unavailable",
        },
        404,
      );
    }

    /* -----------------------------------------------
       5. Load invoice context
    ------------------------------------------------ */

    stage =
      "load_invoice_context";

    const [
      {
        data: lines,
      },
      {
        data: company,
      },
      {
        data: customer,
      },
    ] =
      await Promise.all([
        db
          .from(
            "invoice_lines",
          )
          .select("*")
          .eq(
            "invoice_id",
            invoiceId,
          )
          .order(
            "position",
          ),

        db
          .from("companies")
          .select("*")
          .eq(
            "id",
            invoice.company_id,
          )
          .maybeSingle(),

        invoice.customer_id
          ? db
              .from(
                "customers",
              )
              .select("*")
              .eq(
                "id",
                invoice.customer_id,
              )
              .maybeSingle()
          : Promise.resolve({
              data: null,
            }),
      ]);

    const environment = String(company?.nrs_environment ?? "").trim().toLowerCase();

    // Never silently treat a real tenant as a mock invoice flow.
    if (environment !== "sandbox" && environment !== "production") {
      return json({ ok: false, stage: "resolve_environment", error: "Company NRS environment must be explicitly set to sandbox or production. Mock signing is disabled in this endpoint." }, 422);
    }

    const normalizedInvoiceType = normalizeInvoiceTypeCode(invoice.invoice_type);
    if (!normalizedInvoiceType.valid) {
      const missing = normalizedInvoiceType.reason === "missing";
      return json({
        ok: false,
        stage: "invoice_type_validation",
        error: missing ? "Invoice type is required." : "Invoice type is not supported by the NRS invoice-type resource.",
        code: missing ? "INVOICE_TYPE_REQUIRED" : "INVOICE_TYPE_UNSUPPORTED",
        retry_safe: true,
      }, 422);
    }

    /* -----------------------------------------------
       6. Generate IRN
    ------------------------------------------------ */

    stage =
      "generate_irn";

    let irn: string;

    try {
      irn =
        invoice.irn ??
        strictIrn(
          String(
            invoice.number ?? "",
          ),
          String(
            company?.nrs_service_id ??
              "",
          ),
          String(
            invoice.issue_date ??
              "",
          ),
        );
    } catch (error) {
      return json(
        {
          ok: false,
          stage,
          error:
            error instanceof Error
              ? error.message
              : "Unable to generate NRS IRN",
        },
        422,
      );
    }

    console.log(
      "NRS_STAGE",
      {
        stage,
        invoice_id:
          invoiceId,
        environment,
        irn,
      },
    );

    /* -----------------------------------------------
       7. Local validation
    ------------------------------------------------ */

    stage =
      "local_validation";

    const localErrors =
      validateInput(
        invoice,
        lines ?? [],
        company,
        customer,
      );

    if (
      localErrors.length
    ) {
      await db
        .from("invoices")
        .update({
          status:
            "Rejected",

          submission_status:
            "rejected",

          submission_response: {
            stage,

            errors:
              localErrors,

            irn,
          },
        })
        .eq(
          "id",
          invoiceId,
        );

      console.error(
        "NRS_STAGE",
        {
          stage,
          invoice_id:
            invoiceId,
          errors:
            localErrors,
        },
      );

      return json(
        {
          ok: false,
          stage,
          error:
            "Invoice failed local NRS validation",
          errors:
            localErrors,
          irn,
        },
        422,
      );
    }

    /* -----------------------------------------------
       8. Build payload
    ------------------------------------------------ */

    stage =
      "build_payload";

    const payload =
      buildPayload(
        invoice,
        lines ?? [],
        company,
        customer,
        irn,
        normalizedInvoiceType.code,
      );

    /* -----------------------------------------------
       9. Load taxpayer crypto
    ------------------------------------------------ */

    stage =
      "load_taxpayer_crypto";

    const {
      data: taxpayerCrypto,
      error:
        cryptoError,
    } =
      await db
        .from(
          "nrs_taxpayer_crypto",
        )
        .select(
          "public_key,certificate",
        )
        .eq(
          "company_id",
          invoice.company_id,
        )
        .eq(
          "environment",
          environment,
        )
        .eq(
          "active",
          true,
        )
        .maybeSingle();

    if (
      cryptoError ||
      !taxpayerCrypto
    ) {
      console.error(
        "NRS_STAGE",
        {
          stage,
          invoice_id:
            invoiceId,
          error:
            "Taxpayer cryptographic configuration missing",
        },
      );

      return json(
        {
          ok: false,
          stage,
          error:
            "Taxpayer cryptographic configuration is required",
        },
        422,
      );
    }

    console.log(
      "NRS_STAGE",
      {
        stage,
        invoice_id:
          invoiceId,
        crypto_configured:
          true,
      },
    );

    /* -----------------------------------------------
       10. Persist pending
    ------------------------------------------------ */

    stage =
      "persist_pending";

    const {
      error:
        pendingError,
    } =
      await db
        .from("invoices")
        .update({
          irn,

          submission_status:
            "pending",
        })
        .eq(
          "id",
          invoiceId,
        );

    if (pendingError) {
      throw pendingError;
    }

    /* Mock signing is disabled: only real sandbox/production NRS calls may succeed. */

    /* -----------------------------------------------
       12. Resolve NRS base URL
    ------------------------------------------------ */

    stage =
      "resolve_base_url";

    const configuredBaseUrl = environment === "production"
      ? company?.nrs_production_base_url
      : company?.nrs_sandbox_base_url;
    const baseUrl = resolveNrsBaseUrl(configuredBaseUrl, environment);

    if (!baseUrl) {
      return json(
        {
          ok: false,
          stage,
          error: `NRS ${environment} base URL must use the approved HTTPS origin`,
        },
        422,
      );
    }

    console.log(
      "NRS_STAGE",
      {
        stage,
        invoice_id:
          invoiceId,
        environment,
        base_url:
          baseUrl,
      },
    );

    /* -----------------------------------------------
       13. Load taxpayer credentials
    ------------------------------------------------ */

    stage =
      "load_taxpayer_credentials";

    const {
      data:
        taxpayerSecrets,
      error:
        taxpayerSecretError,
    } =
      await db.rpc(
        "nrs_read_taxpayer_secrets",
        {
          _company_id:
            invoice.company_id,

          _environment:
            environment,
        },
      );

    if (
      taxpayerSecretError
    ) {
      console.error(
        "NRS_STAGE",
        {
          stage,
          invoice_id:
            invoiceId,
          error:
            "Unable to read taxpayer credentials",
        },
      );

      return json(
        {
          ok: false,
          stage,
          error:
            "Unable to load taxpayer NRS credentials",
        },
        500,
      );
    }

    const secret =
      Array.isArray(
        taxpayerSecrets,
      )
        ? taxpayerSecrets[0]
        : taxpayerSecrets;

    const apiKey =
      String(
        secret?.api_key ?? "",
      ).trim();

    const apiSecret =
      String(
        secret?.api_secret ?? "",
      ).trim();

    if (
      !apiKey ||
      !apiSecret
    ) {
      console.error(
        "NRS_STAGE",
        {
          stage,
          invoice_id:
            invoiceId,
          error:
            "Taxpayer credentials missing",
        },
      );

      return json(
        {
          ok: false,
          stage,
          error:
            "Taxpayer NRS API credentials are not configured for this company/environment",
        },
        422,
      );
    }

    /*
     * SECURITY:
     * Do NOT log apiKey or apiSecret.
     */
    console.log("NRS_STAGE", { stage, invoice_id: invoiceId, taxpayer_credentials_loaded: true });
    const { data: claimedAttempt, error: claimError } = await db.rpc("nrs_claim_submission_attempt", {
      _invoice_id: invoiceId, _company_id: invoice.company_id, _environment: environment, _created_by: user.id,
    });
    if (claimError || !claimedAttempt) {
      const message = claimError?.message ?? "Unable to create submission attempt";
      const duplicate = /already (completed|processing)/i.test(message);
      return json({ ok: false, stage: "claim_attempt", error: duplicate ? message : "Unable to safely start submission" }, duplicate ? 409 : 500);
    }
    attemptId = String(claimedAttempt);

    /* -----------------------------------------------
       14. Build NRS headers
    ------------------------------------------------ */

    const headers = {
      "Content-Type":
        "application/json",

      Accept:
        "application/json",

      "x-api-key":
        apiKey,

      "x-api-secret":
        apiSecret,
    };

    /* -----------------------------------------------
       15. NRS Validate
    ------------------------------------------------ */

    stage =
      "nrs_validate_request";

    console.log(
      "NRS_VALIDATE_REQUEST",
      {
        invoice_id:
          invoiceId,

        business_id:
          company?.nrs_business_id,

        irn,

        environment,

        endpoint:
          `${baseUrl}/api/v1/invoice/validate`,
      },
    );

    let validateResponse: Response;

    try {
      validateResponse =
        await fetch(
          `${baseUrl}/api/v1/invoice/validate`,
          {
            method:
              "POST",

            headers,

            body:
              JSON.stringify(
                payload,
              ),
            redirect: "error",
            signal: AbortSignal.timeout(20000),
          },
        );
    } catch (error) {
      console.error(
        "NRS_VALIDATE_NETWORK_ERROR",
        {
          stage,
          invoice_id:
            invoiceId,
          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
      );

      await db.rpc("nrs_finish_submission_attempt", {
        _attempt_id: attemptId, _status: "failed", _stage: stage, _irn: irn,
        _error_code: "NRS_VALIDATE_NETWORK_ERROR",
        _error_message: "Network failure before signing; review before retrying",
      });
      return json({ ok: false, stage, error: "Unable to reach NRS validate endpoint", details: error instanceof Error ? error.message : String(error) }, 502);
    }

    stage =
      "nrs_validate_response";

    const validateData =
      await readBody(
        validateResponse,
      );

    console.log(
      "NRS_VALIDATE_RESPONSE",
      {
        invoice_id:
          invoiceId,

        http_status:
          validateResponse.status,

        response_received:
          true,
      },
    );

    if (
      !validateResponse.ok ||
      validateData?.status ===
        false
    ) {
      const message =
        getMessage(
          validateData,
          `NRS validation failed (HTTP ${validateResponse.status})`,
        );

      await db.from("invoices").update({
        status: "Rejected", submission_status: "rejected",
        submission_response: { stage: "nrs_validate", http_status: validateResponse.status, response: validateData },
      }).eq("id", invoiceId);
      await db.rpc("nrs_finish_submission_attempt", {
        _attempt_id: attemptId, _status: "failed", _stage: "nrs_validate", _irn: irn,
        _http_status: validateResponse.status, _response_summary: validateData,
        _error_code: "NRS_VALIDATE_REJECTED", _error_message: message,
      });

      return json(
        {
          ok: false,
          stage:
            "nrs_validate",
          error:
            message,
          details:
            validateData,
        },
        422,
      );
    }

    /* -----------------------------------------------
       16. Persist validation success
    ------------------------------------------------ */

    const validatedAt =
      new Date().toISOString();

    await db
      .from("invoices")
      .update({
        status:
          "Validated",

        submission_status:
          "validated",

        validated_at:
          validatedAt,

        nrs_validated_at:
          validatedAt,

        submission_response: {
          stage:
            "nrs_validate",

          response:
            validateData,
        },
      })
      .eq(
        "id",
        invoiceId,
      );

    /* -----------------------------------------------
       17. NRS Sign
    ------------------------------------------------ */

    stage = "nrs_sign_request";
    signingStarted = true;

    console.log(
      "NRS_SIGN_REQUEST",
      {
        invoice_id:
          invoiceId,

        business_id:
          company?.nrs_business_id,

        irn,

        environment,

        endpoint:
          `${baseUrl}/api/v1/invoice/sign`,
      },
    );

    let signResponse: Response;

    try {
      signResponse =
        await fetch(
          `${baseUrl}/api/v1/invoice/sign`,
          {
            method:
              "POST",

            headers,

            body:
              JSON.stringify(
                payload,
              ),
            redirect: "error",
            signal: AbortSignal.timeout(20000),
          },
        );
    } catch (error) {
      console.error(
        "NRS_SIGN_NETWORK_ERROR",
        {
          stage,
          invoice_id:
            invoiceId,
          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
      );

      await db.rpc("nrs_finish_submission_attempt", {
        _attempt_id: attemptId, _status: "unknown", _stage: stage, _irn: irn,
        _error_code: "NRS_SIGN_OUTCOME_UNKNOWN",
        _error_message: "Signing outcome unknown; reconcile before retrying",
      });
      await db.from("invoices").update({
        submission_status: "timeout",
        submission_response: { stage, outcome: "unknown", message: "Signing outcome unknown; reconcile before retrying" },
      }).eq("id", invoiceId);
      return json({ ok: false, stage, error: "Signing outcome unknown; reconcile before retrying", details: error instanceof Error ? error.message : String(error) }, 502);
    }

    stage =
      "nrs_sign_response";

    const signData =
      await readBody(
        signResponse,
      );

    console.log(
      "NRS_SIGN_RESPONSE",
      {
        invoice_id:
          invoiceId,

        http_status:
          signResponse.status,

        response_received:
          true,
      },
    );

    if (
      !signResponse.ok ||
      signData?.status === false
    ) {
      const message = getMessage(
        signData,
        `NRS signing failed (HTTP ${signResponse.status})`,
      );
      // NRS public_message is generic and often mentions duplicate requests even
      // for ordinary validation errors, so classify using specific details/message only.
      const detailText = [
        signData?.error?.details,
        signData?.message,
      ].filter(Boolean).join(" ");
      // Generic/transient signing errors do not prove the invoice was not signed.
      // Preserve the validated state and require reconciliation before any retry.
      const outcomeUnknown =
        signResponse.status >= 500 ||
        /try again later|unable to complete this operation|temporar|timed? ?out|duplicate request/i.test(detailText);

      if (outcomeUnknown) {
        await db.from("invoices").update({
          status: "Validated",
          submission_status: "timeout",
          submission_response: {
            stage: "nrs_sign",
            outcome: "unknown",
            http_status: signResponse.status,
            message: "Signing outcome requires reconciliation before retrying",
            response: signData,
          },
        }).eq("id", invoiceId);

        await db.rpc("nrs_finish_submission_attempt", {
          _attempt_id: attemptId, _status: "unknown", _stage: "nrs_sign",
          _irn: irn, _http_status: signResponse.status,
          _response_summary: signData,
          _error_code: "NRS_SIGN_OUTCOME_UNKNOWN",
          _error_message: "NRS returned an ambiguous signing response; reconcile before retrying",
        });

        return json({
          ok: false,
          stage: "nrs_sign",
          outcome: "unknown",
          retry_safe: false,
          error: "NRS did not confirm whether signing completed. Reconcile this IRN before retrying.",
          details: signData,
        }, 502);
      }

      await db.from("invoices").update({
        status: "Rejected",
        submission_status: "rejected",
        submission_response: {
          stage: "nrs_sign",
          outcome: "rejected",
          http_status: signResponse.status,
          response: signData,
        },
      }).eq("id", invoiceId);

      await db.rpc("nrs_finish_submission_attempt", {
        _attempt_id: attemptId, _status: "failed", _stage: "nrs_sign", _irn: irn,
        _http_status: signResponse.status, _response_summary: signData,
        _error_code: "NRS_SIGN_REJECTED", _error_message: message,
      });

      return json({
        ok: false,
        stage: "nrs_sign",
        outcome: "rejected",
        retry_safe: false,
        error: message,
        details: signData,
      }, 422);
    }

    /* -----------------------------------------------
       18. Extract NRS signing result
    ------------------------------------------------ */

    stage =
      "read_sign_result";

    const returnedIrn =
      signData?.irn ??
      signData?.data?.irn ??
      irn;

    const csid =
      signData?.csid ??
      signData?.data?.csid ??
      null;

    /* -----------------------------------------------
       19. Generate taxpayer QR
    ------------------------------------------------ */

    stage =
      "generate_qr";

    const qr =
      await generateQr(
        returnedIrn,
        taxpayerCrypto,
      );

    /* -----------------------------------------------
       20. Persist complete result
    ------------------------------------------------ */

    stage =
      "persist_success";

    const {
      error:
        persistError,
    } =
      await db
        .from("invoices")
        .update({
          irn:
            returnedIrn,

          csid,

          qr_code_data:
            qr.data,

          qr_code:
            qr.qr,

          status:
            "Signed",

          submission_status:
            "signed",

          nrs_signed_at:
            new Date().toISOString(),

          submitted_at:
            new Date().toISOString(),

          submission_response: {
            stage:
              "nrs_sign",

            response:
              signData,
          },
        })
        .eq(
          "id",
          invoiceId,
        );

    if (persistError) {
      await db.rpc("nrs_finish_submission_attempt", {
        _attempt_id: attemptId, _status: "unknown", _stage: "persist_success",
        _irn: returnedIrn, _error_code: "LOCAL_PERSIST_FAILED_AFTER_SIGN",
        _error_message: "NRS signing succeeded but local persistence failed; reconcile before retrying",
      });
      throw persistError;
    }
    await db.rpc("nrs_finish_submission_attempt", {
      _attempt_id: attemptId, _status: "succeeded", _stage: "complete",
      _irn: returnedIrn, _http_status: signResponse.status,
      _response_summary: { validated: true, signed: true, qr_generated: true },
    });

    return json({
      ok: true,

      environment,

      irn:
        returnedIrn,

      csid,

      status:
        "Signed",

      qr_generated:
        true,

      message:
        "Invoice validated and signed by NRS. APP transmission/clearance is not performed by the SI flow.",
    });
  } catch (error) {
    if (adminDb && attemptId) {
      try {
        await adminDb.rpc("nrs_finish_submission_attempt", {
          _attempt_id: attemptId, _status: signingStarted ? "unknown" : "failed",
          _stage: stage,
          _error_code: signingStarted ? "SIGNING_OUTCOME_UNKNOWN" : "SUBMISSION_FAILED",
          _error_message: signingStarted ? "Error after signing started; reconcile before retrying" : "Submission failed before signing",
        });
      } catch (finalizeError) {
        console.error("NRS_ATTEMPT_FINALIZE_FAILED", { stage, message: finalizeError instanceof Error ? finalizeError.message : String(finalizeError) });
      }
      if (signingStarted && activeInvoiceId) {
        try {
          await adminDb.from("invoices").update({
            submission_status: "timeout",
            submission_response: {
              stage,
              outcome: "unknown",
              message: "An error occurred after signing started; reconcile with NRS before retrying",
            },
          }).eq("id", activeInvoiceId);
        } catch (invoiceStateError) {
          console.error("NRS_INVOICE_RECONCILIATION_STATE_FAILED", {
            stage,
            message: invoiceStateError instanceof Error ? invoiceStateError.message : String(invoiceStateError),
          });
        }
      }
    }
    console.error(
      "NRS_SUBMIT_UNHANDLED",
      {
        stage,

        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );

    return json(
      {
        ok: false,

        stage,

        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      500,
    );
  }
});
