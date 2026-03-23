import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import TeacherPanel from "./pages/TeacherPanel";
import Presentacion from "./pages/Presentacion";
import Guia from "./pages/Guia";
import PlataformaPanel from "./pages/PlataformaPanel";
import AcademyPanel from "./pages/AcademyPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/teacher" element={<TeacherPanel />} />
          <Route path="/presentacion" element={<Presentacion />} />
          <Route path="/presentacion/:teacherId" element={<Presentacion />} />
          <Route path="/presentacion/:teacherId/:classId" element={<Presentacion />} />
          <Route path="/guia" element={<Guia />} />
          <Route path="/plataforma" element={<PlataformaPanel />} />
          <Route path="/academy" element={<AcademyPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
