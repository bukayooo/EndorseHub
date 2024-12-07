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
import AuthPage from "./pages/AuthPage";
import { Loader2 } from "lucide-react";
import { useUser } from "./hooks/use-user";

function Router() {
  const { user, isLoading } = useUser();
  const [showAuth, setShowAuth] = useState(false);
  const [location, setLocation] = useLocation();

  // Handle post-login navigation and auth modal state
  useEffect(() => {
    if (user) {
      setShowAuth(false); // Close auth modal when user is logged in
      if (location === '/') {
        setLocation('/dashboard'); // Redirect to dashboard if on home page
      }
    }
  }, [user, location, setLocation]);

  // Prevent showing auth modal when user is already logged in
  const handleShowAuth = () => {
    if (!user) {
      setShowAuth(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <>
      {/* Only show auth modal if user is not logged in and showAuth is true */}
      {showAuth && !user && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
          <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
            <AuthPage onClose={() => setShowAuth(false)} />
          </div>
        </div>
      )}
      <Switch>
        <Route path="/">
          <HomePage onGetStarted={handleShowAuth} />
        </Route>
        {user ? (
          <>
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/widgets/new" component={WidgetBuilder} />
          </>
        ) : null}
        <Route>404 Page Not Found</Route>
      </Switch>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
