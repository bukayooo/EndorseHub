import React from "react";
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
import AuthPage from "./pages/AuthPage";
import { Loader2 } from "lucide-react";
import { useUser } from "./hooks/use-user";

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-xl font-semibold mb-4">Something went wrong</h1>
          <p className="text-red-600 mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppRouter() {
  const { user, isLoading } = useUser();
  const [showAuth, setShowAuth] = React.useState(false);
  const [, navigate] = useLocation();

  React.useEffect(() => {
    console.log('App mounting, user state:', { isLoading, hasUser: !!user });
    
    if (user && window.location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [user, navigate, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoading } = useUser();
    const [, navigate] = useLocation();
    
    React.useEffect(() => {
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
    <ErrorBoundary>
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
        <Route>
          <div className="flex items-center justify-center min-h-screen">
            <h1 className="text-2xl">404 Page Not Found</h1>
          </div>
        </Route>
      </Switch>
    </ErrorBoundary>
  );
}

// Initialize the application with error handling
const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

try {
  createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppRouter />
          <Toaster />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Error mounting React application:', error);
  document.body.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;">
      <h1 style="color:red;margin-bottom:1rem;">Failed to load application</h1>
      <p>${error instanceof Error ? error.message : 'Unknown error occurred'}</p>
    </div>
  `;
}
