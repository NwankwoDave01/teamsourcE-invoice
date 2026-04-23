// Centralized mock data for the e-invoicing SaaS shell.
// All UI is rendered from these fixtures so screens stay consistent.

export type InvoiceStatus =
  | "Draft"
  | "In Review"
  | "Approved"
  | "Ready"
  | "Submitted"
  | "Validated"
  | "Signed"
  | "Confirmed"
  | "Rejected";

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "Draft",
  "In Review",
  "Approved",
  "Ready",
  "Submitted",
  "Validated",
  "Signed",
  "Confirmed",
  "Rejected",
];

export interface Company {
  id: string;
  name: string;
  tin: string;
  plan: "Starter" | "Growth" | "Enterprise";
  industry: string;
  status: "Active" | "Trial" | "Suspended";
  users: number;
  invoices: number;
  joinedAt: string;
}

export const companies: Company[] = [
  { id: "co_1", name: "Sahara Foods Ltd", tin: "NG-12834521", plan: "Growth", industry: "FMCG", status: "Active", users: 18, invoices: 1240, joinedAt: "2024-02-14" },
  { id: "co_2", name: "Bluewave Logistics", tin: "NG-29845611", plan: "Enterprise", industry: "Logistics", status: "Active", users: 42, invoices: 3870, joinedAt: "2023-11-02" },
  { id: "co_3", name: "Kano Textiles Co.", tin: "NG-77123890", plan: "Starter", industry: "Manufacturing", status: "Trial", users: 6, invoices: 92, joinedAt: "2025-08-21" },
  { id: "co_4", name: "Lagos MedSupply", tin: "NG-33459021", plan: "Growth", industry: "Healthcare", status: "Active", users: 22, invoices: 1810, joinedAt: "2024-06-30" },
  { id: "co_5", name: "Greenfield Agro", tin: "NG-58129004", plan: "Starter", industry: "Agriculture", status: "Suspended", users: 4, invoices: 211, joinedAt: "2024-01-19" },
];

export const currentCompany = companies[0];

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tin: string;
  city: string;
  outstanding: number;
  invoices: number;
  status: "Active" | "Inactive";
}

export const customers: Customer[] = [
  { id: "c_1", name: "Adeola Ventures", email: "billing@adeolaventures.ng", phone: "+234 802 145 9921", tin: "NG-44192011", city: "Lagos", outstanding: 845_000, invoices: 24, status: "Active" },
  { id: "c_2", name: "Okonkwo & Sons", email: "ap@okonkwo.com", phone: "+234 803 998 4421", tin: "NG-22091887", city: "Enugu", outstanding: 0, invoices: 11, status: "Active" },
  { id: "c_3", name: "Northern Grains Co.", email: "finance@ngrains.ng", phone: "+234 805 332 0021", tin: "NG-77004412", city: "Kano", outstanding: 1_240_000, invoices: 38, status: "Active" },
  { id: "c_4", name: "Heritage Bank Plc", email: "vendors@heritage.ng", phone: "+234 700 100 2200", tin: "NG-10094211", city: "Lagos", outstanding: 3_500_000, invoices: 17, status: "Active" },
  { id: "c_5", name: "PortHarcourt Refining", email: "ap@phrefining.ng", phone: "+234 808 442 1190", tin: "NG-66128901", city: "Port Harcourt", outstanding: 0, invoices: 9, status: "Inactive" },
  { id: "c_6", name: "MTN Nigeria", email: "vendors@mtn.com.ng", phone: "+234 803 000 0001", tin: "NG-99001122", city: "Lagos", outstanding: 250_000, invoices: 42, status: "Active" },
  { id: "c_7", name: "Dangote Cement", email: "ap@dangote.com", phone: "+234 802 991 4400", tin: "NG-88112233", city: "Obajana", outstanding: 1_100_000, invoices: 31, status: "Active" },
  { id: "c_8", name: "Zenith Logistics", email: "billing@zenithlog.ng", phone: "+234 815 220 0091", tin: "NG-55029100", city: "Abuja", outstanding: 0, invoices: 6, status: "Active" },
  { id: "c_9", name: "Eko Hotels", email: "ap@ekohotels.com", phone: "+234 802 270 0900", tin: "NG-44782300", city: "Lagos", outstanding: 95_000, invoices: 4, status: "Active" },
  { id: "c_10", name: "Shoprite Holdings", email: "vendors@shoprite.ng", phone: "+234 700 555 1212", tin: "NG-12001399", city: "Lagos", outstanding: 720_000, invoices: 19, status: "Active" },
];

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  taxRate: number;
  active: boolean;
}

export const products: Product[] = [
  { id: "p_1", sku: "SF-RICE-50", name: "Premium Parboiled Rice 50kg", category: "Grains", unit: "Bag", price: 78_500, taxRate: 7.5, active: true },
  { id: "p_2", sku: "SF-OIL-25", name: "Refined Palm Oil 25L", category: "Oils", unit: "Jerry can", price: 42_000, taxRate: 7.5, active: true },
  { id: "p_3", sku: "SF-SUGAR-50", name: "Granulated Sugar 50kg", category: "Sweeteners", unit: "Bag", price: 36_750, taxRate: 7.5, active: true },
  { id: "p_4", sku: "SF-FLOUR-50", name: "Wheat Flour 50kg", category: "Grains", unit: "Bag", price: 41_200, taxRate: 7.5, active: true },
  { id: "p_5", sku: "SF-MILK-12", name: "Powdered Milk Carton (12)", category: "Dairy", unit: "Carton", price: 58_900, taxRate: 7.5, active: true },
  { id: "p_6", sku: "SF-SALT-25", name: "Iodized Salt 25kg", category: "Condiments", unit: "Bag", price: 9_400, taxRate: 7.5, active: true },
  { id: "p_7", sku: "SF-PASTA-20", name: "Spaghetti Carton (20 packs)", category: "Pasta", unit: "Carton", price: 18_300, taxRate: 7.5, active: true },
  { id: "p_8", sku: "SF-TOMATO-24", name: "Tomato Paste Carton (24)", category: "Condiments", unit: "Carton", price: 22_500, taxRate: 7.5, active: false },
  { id: "p_9", sku: "SVC-DELIV", name: "Logistics & Delivery Service", category: "Service", unit: "Trip", price: 35_000, taxRate: 7.5, active: true },
  { id: "p_10", sku: "SVC-CONSULT", name: "Compliance Consulting", category: "Service", unit: "Hour", price: 25_000, taxRate: 7.5, active: true },
];

export interface InvoiceLine {
  productId: string;
  description: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  currency: "NGN";
  irn?: string; // NRS/FIRS reference number
  createdBy: string;
  lines: InvoiceLine[];
}

const mkInvoice = (i: number, status: InvoiceStatus): Invoice => {
  const customer = customers[i % customers.length];
  const product = products[i % products.length];
  const qty = ((i % 7) + 1) * 5;
  const subtotal = product.price * qty;
  const tax = Math.round(subtotal * (product.taxRate / 100));
  const issue = new Date(2025, 9, 1 + (i % 28));
  const due = new Date(issue);
  due.setDate(due.getDate() + 30);
  return {
    id: `inv_${1000 + i}`,
    number: `INV-2025-${String(1000 + i).padStart(5, "0")}`,
    customerId: customer.id,
    customerName: customer.name,
    issueDate: issue.toISOString().slice(0, 10),
    dueDate: due.toISOString().slice(0, 10),
    status,
    subtotal,
    tax,
    total: subtotal + tax,
    currency: "NGN",
    irn: ["Submitted", "Validated", "Signed", "Confirmed"].includes(status)
      ? `NRS-${(2_000_000 + i * 137).toString(36).toUpperCase()}`
      : undefined,
    createdBy: ["Adaeze O.", "Tunde A.", "Ifeoma E.", "Bola K."][i % 4],
    lines: [
      { productId: product.id, description: product.name, qty, unitPrice: product.price, taxRate: product.taxRate },
      { productId: products[9].id, description: products[9].name, qty: 2, unitPrice: products[9].price, taxRate: 7.5 },
    ],
  };
};

const statusDistribution: InvoiceStatus[] = [
  "Confirmed", "Confirmed", "Confirmed", "Signed", "Signed",
  "Validated", "Validated", "Submitted", "Submitted", "Ready",
  "Approved", "Approved", "In Review", "In Review", "Draft",
  "Draft", "Rejected", "Confirmed", "Signed", "Submitted",
  "Validated", "Confirmed", "In Review", "Approved", "Ready",
  "Confirmed", "Draft", "Signed", "Submitted", "Validated",
  "Confirmed", "Approved", "In Review", "Ready", "Confirmed",
  "Rejected", "Signed", "Confirmed", "Validated", "Submitted",
];

export const invoices: Invoice[] = statusDistribution.map((s, i) => mkInvoice(i, s));

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Company Admin" | "Finance Officer" | "Staff User";
  status: "Active" | "Invited" | "Disabled";
  lastActive: string;
}

export const team: TeamMember[] = [
  { id: "u_1", name: "Adaeze Okafor", email: "adaeze@saharafoods.ng", role: "Company Admin", status: "Active", lastActive: "2 minutes ago" },
  { id: "u_2", name: "Tunde Adebayo", email: "tunde@saharafoods.ng", role: "Finance Officer", status: "Active", lastActive: "12 minutes ago" },
  { id: "u_3", name: "Ifeoma Eze", email: "ifeoma@saharafoods.ng", role: "Finance Officer", status: "Active", lastActive: "1 hour ago" },
  { id: "u_4", name: "Bola Kareem", email: "bola@saharafoods.ng", role: "Staff User", status: "Active", lastActive: "3 hours ago" },
  { id: "u_5", name: "Chinedu Obi", email: "chinedu@saharafoods.ng", role: "Staff User", status: "Active", lastActive: "Yesterday" },
  { id: "u_6", name: "Fatima Bello", email: "fatima@saharafoods.ng", role: "Staff User", status: "Invited", lastActive: "—" },
  { id: "u_7", name: "Segun Ogun", email: "segun@saharafoods.ng", role: "Staff User", status: "Disabled", lastActive: "12 days ago" },
];

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  category: "Invoice" | "Customer" | "Product" | "User" | "Settings" | "Auth";
  ip: string;
  timestamp: string;
}

export const auditLogs: AuditLog[] = Array.from({ length: 50 }).map((_, i) => {
  const cats: AuditLog["category"][] = ["Invoice", "Customer", "Product", "User", "Settings", "Auth"];
  const actions = [
    "created invoice", "submitted invoice to NRS", "approved invoice",
    "rejected invoice", "added customer", "updated product price",
    "invited user", "changed role", "updated tax settings", "logged in",
  ];
  const actors = team.map((t) => t.name);
  const t = new Date(2025, 9, 28, 9 + (i % 9), (i * 7) % 60);
  return {
    id: `log_${i + 1}`,
    actor: actors[i % actors.length],
    action: actions[i % actions.length],
    target: i % 2 === 0 ? `INV-2025-${String(1000 + (i % 40)).padStart(5, "0")}` : customers[i % customers.length].name,
    category: cats[i % cats.length],
    ip: `102.89.${20 + (i % 200)}.${(i * 13) % 250}`,
    timestamp: t.toISOString().replace("T", " ").slice(0, 16),
  };
});

// Aggregate metrics for dashboards
export const tenantMetrics = {
  totalRevenue: invoices.filter((i) => ["Confirmed", "Signed"].includes(i.status)).reduce((s, i) => s + i.total, 0),
  outstanding: invoices.filter((i) => ["Submitted", "Validated", "Approved"].includes(i.status)).reduce((s, i) => s + i.total, 0),
  invoicesThisMonth: invoices.length,
  validationRate: 96.4,
};

export const adminMetrics = {
  companies: companies.length,
  activeUsers: 314,
  invoicesProcessed: 28_412,
  submissionSuccess: 98.7,
};

export const integrationHealth = [
  { name: "NRS Invoice Validation API", status: "Operational" as const, uptime: "99.98%", latency: "184ms", lastIncident: "23 days ago" },
  { name: "FIRS Digital Signing Service", status: "Operational" as const, uptime: "99.92%", latency: "320ms", lastIncident: "8 days ago" },
  { name: "TIN Verification Service", status: "Degraded" as const, uptime: "97.40%", latency: "1.2s", lastIncident: "Today, 09:14" },
  { name: "Currency Exchange Feed", status: "Operational" as const, uptime: "100%", latency: "92ms", lastIncident: "—" },
  { name: "Email Delivery (SMTP)", status: "Operational" as const, uptime: "99.99%", latency: "—", lastIncident: "—" },
  { name: "Webhook Dispatcher", status: "Maintenance" as const, uptime: "99.50%", latency: "210ms", lastIncident: "Scheduled" },
];

export const platformUsers = Array.from({ length: 24 }).map((_, i) => ({
  id: `pu_${i + 1}`,
  name: ["Adaeze Okafor","Tunde Adebayo","Ifeoma Eze","Bola Kareem","Chinedu Obi","Fatima Bello","Yusuf Aliyu","Grace Nwosu","Emeka Eze","Hassan Bello"][i % 10] + (i > 9 ? ` ${i}` : ""),
  email: `user${i + 1}@${["saharafoods","bluewave","kanotextiles","lagosmed","greenfield"][i % 5]}.ng`,
  company: companies[i % companies.length].name,
  role: (["Company Admin","Finance Officer","Staff User"] as const)[i % 3],
  status: (["Active","Active","Active","Invited","Disabled"] as const)[i % 5],
  lastActive: ["Just now","5m ago","1h ago","Yesterday","3 days ago"][i % 5],
}));

export const systemLogs = Array.from({ length: 40 }).map((_, i) => ({
  id: `sys_${i + 1}`,
  level: (["INFO","INFO","WARN","INFO","ERROR","INFO"] as const)[i % 6],
  service: ["api-gateway","invoice-worker","nrs-connector","auth-service","webhook-dispatcher"][i % 5],
  message: [
    "Invoice submitted to NRS",
    "Validation succeeded",
    "Retrying failed webhook",
    "User authenticated",
    "Connector timeout — retry scheduled",
    "Cache warmed",
  ][i % 6],
  timestamp: new Date(2025, 9, 28, 9 + (i % 12), (i * 11) % 60).toISOString().replace("T", " ").slice(0, 19),
}));
