import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AiAssistantButton from "@/components/AiAssistantButton";
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import Alumni from "./pages/Alumni";
import Partners from "./pages/Partners";
import Events from "./pages/Events";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Chat from "./pages/Chat";
import CbtList from "./pages/CbtList";
import CbtTake from "./pages/CbtTake";
import PsikotesList from "./pages/PsikotesList";
import PsikotesTake from "./pages/PsikotesTake";
import Universities from "./pages/Universities";
import TracerStudy from "./pages/TracerStudy";
import Scholarships from "./pages/Scholarships";
import Tentang from "./pages/Tentang";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/alumni" element={<Alumni />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/events" element={<Events />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/cbt" element={<CbtList />} />
            <Route path="/cbt/:id" element={<CbtTake />} />
            <Route path="/psikotes" element={<PsikotesList />} />
            <Route path="/psikotes/:id" element={<PsikotesTake />} />
            <Route path="/universities" element={<Universities />} />
            <Route path="/tracer" element={<TracerStudy />} />
            <Route path="/beasiswa" element={<Scholarships />} />
            <Route path="/tentang" element={<Tentang />} />
            <Route path="/profil" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
          <AiAssistantButton />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
