import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, useLocation } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import WidgetBuilder from "./pages/WidgetBuilder";
import WidgetsPage from "./pages/WidgetsPage";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";
import { Loader2 } from "lucide-react";
import { useUser } from "./hooks/use-user";

function AppRouter() {
  const { user, isLoading } = useUser();
  const [showAuth, setShowAuth] = useState(false);
  const [, navigate] = useLocation();

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (user && window.location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Protected route wrapper
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading } = useUser();
    const [, navigate] = useLocation();
    
    useEffect(() => {
      if (!isLoading && !user) {
        navigate('/');
      }
    }, [user, isLoading, navigate]);
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      );
    }
    
    return user ? <>{children}</> : null;
  };

  return (
    <>
      {showAuth && !user && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
          <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
            <AuthPage onClose={() => setShowAuth(false)} />
          </div>
        </div>
      )}
      <Switch>
        <Route path="/">
          {user ? (
            <DashboardPage />
          ) : (
            <HomePage onGetStarted={() => setShowAuth(true)} />
          )}
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        </Route>
        <Route path="/widgets/new">
          <ProtectedRoute>
            <WidgetBuilder />
          </ProtectedRoute>
        </Route>
        <Route path="/widgets">
          <ProtectedRoute>
            <WidgetsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/settings">
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        </Route>
        <Route>404 Page Not Found</Route>
      </Switch>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>
);
