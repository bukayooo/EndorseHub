
import React from 'react';
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import WidgetBuilder from "./pages/WidgetBuilder";
import WidgetsPage from "./pages/WidgetsPage";
import AuthPage from "./pages/AuthPage";
import { Loader2 } from "lucide-react";
import { useUser } from "./hooks/use-user";

export default function App() {
  const { user, isLoading } = useUser();
  const [showAuth, setShowAuth] = React.useState(false);
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!user) {
      navigate('/');
      return null;
    }
    return <>{children}</>;
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
        <Route>
          <div className="flex items-center justify-center min-h-screen">
            <h1 className="text-2xl">404 Page Not Found</h1>
          </div>
        </Route>
      </Switch>
      <Toaster />
    </>
  );
}
