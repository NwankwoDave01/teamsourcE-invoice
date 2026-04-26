import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";

import TenantLayout from "./layouts/TenantLayout";
import AdminLayout from "./layouts/AdminLayout";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

import Dashboard from "./pages/tenant/Dashboard";
import Customers from "./pages/tenant/Customers";
import CreateCustomer from "./pages/tenant/customers/CreateCustomer";
import EditCustomer from "./pages/tenant/customers/EditCustomer";
import Products from "./pages/tenant/Products";
import CreateProduct from "./pages/tenant/products/CreateProduct";
import EditProduct from "./pages/tenant/products/EditProduct";
import Invoices from "./pages/tenant/Invoices";
import CreateInvoice from "./pages/tenant/CreateInvoice";
import InvoiceDetails from "./pages/tenant/InvoiceDetails";
import Reports from "./pages/tenant/Reports";
import Team from "./pages/tenant/Team";
import TenantSettings from "./pages/tenant/Settings";
import AuditLogs from "./pages/tenant/AuditLogs";

import AdminOverview from "./pages/admin/Overview";
import AdminCompanies from "./pages/admin/Companies";
import AdminUsers from "./pages/admin/Users";
import AdminInvoiceTraffic from "./pages/admin/InvoiceTraffic";
import AdminIntegrationHealth from "./pages/admin/IntegrationHealth";
import AdminSystemLogs from "./pages/admin/SystemLogs";
import AdminSettings from "./pages/admin/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<TenantLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/new" element={<CreateCustomer />} />
            <Route path="customers/:id/edit" element={<EditCustomer />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<CreateProduct />} />
            <Route path="products/:id/edit" element={<EditProduct />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/new" element={<CreateInvoice />} />
            <Route path="invoices/:id" element={<InvoiceDetails />} />
            <Route path="reports" element={<Reports />} />
            <Route path="team" element={<Team />} />
            <Route path="settings" element={<TenantSettings />} />
            <Route path="audit-logs" element={<AuditLogs />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute requireSuperAdmin />}>
              <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview" element={<AdminOverview />} />
            <Route path="companies" element={<AdminCompanies />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="invoice-traffic" element={<AdminInvoiceTraffic />} />
            <Route path="integration-health" element={<AdminIntegrationHealth />} />
            <Route path="system-logs" element={<AdminSystemLogs />} />
            <Route path="settings" element={<AdminSettings />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
