import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DarkModeProvider } from "@/contexts/DarkModeContext";
import Index from "@/pages/Index.tsx";
import Register from "@/pages/Register.tsx";
import InstitutionalLogin from "@/pages/InstitutionalLogin.tsx";
import AdminLogin from "@/pages/AdminLogin.tsx";
import AdminDashboard from "@/pages/AdminDashboard.tsx";
import AdminInstitutions from "@/pages/AdminInstitutions.tsx";
import AdminFamilies from "@/pages/AdminFamilies.tsx";
import AdminSettings from "@/pages/AdminSettings.tsx";
import NewFamilyLogin from "@/pages/NewFamilyLogin.tsx";
import FamilyDashboard from "@/pages/FamilyDashboard.tsx";
import InstitutionRegister from "@/pages/InstitutionRegister.tsx";
import InstitutionDashboard from "@/pages/InstitutionDashboard.tsx";
import NotFound from "@/pages/NotFound.tsx";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DarkModeProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/register" element={<Register />} />
            <Route path="/institutional-login" element={<InstitutionalLogin />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/institutions" element={<AdminInstitutions />} />
            <Route path="/admin/families" element={<AdminFamilies />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/family-login" element={<NewFamilyLogin />} />
            <Route path="/family-dashboard" element={<FamilyDashboard />} />
            <Route path="/institution-register" element={<InstitutionRegister />} />
            <Route path="/institution-dashboard" element={<InstitutionDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </DarkModeProvider>
  </QueryClientProvider>
);

export default App;
