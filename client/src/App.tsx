import { useState } from "react";
import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import HomePage from "@/pages/HomePage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import WidgetPage from "@/pages/WidgetPage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AuthPage from "@/pages/AuthPage";

const queryClient = new QueryClient();

export default function App() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Switch>
            <Route path="/">
              {() => <HomePage onGetStarted={() => setShowAuth(true)} />}
            </Route>
            <Route path="/analytics/:id" component={AnalyticsPage} />
            <Route path="/widget/:id" component={WidgetPage} />
          </Switch>

          <Dialog open={showAuth} onOpenChange={setShowAuth}>
            <DialogContent className="sm:max-w-[425px] p-0" hideCloseButton>
              <AuthPage onClose={() => setShowAuth(false)} />
            </DialogContent>
          </Dialog>

          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
} 