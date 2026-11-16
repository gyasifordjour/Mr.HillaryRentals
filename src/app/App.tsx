import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { DemoWorkflowProvider } from "@/features/demo/DemoWorkflowProvider";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import SiteChrome from "@/components/layout/SiteChrome";
import AppRoutes from "@/app/routes";

const queryClient = new QueryClient();

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <DemoWorkflowProvider>
                <SiteChrome>
                  <AppRoutes />
                </SiteChrome>
              </DemoWorkflowProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
