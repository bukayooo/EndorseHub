import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import WidgetPage from '@/pages/WidgetPage';
import AnalyticsPage from '@/pages/AnalyticsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background font-sans antialiased">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/widget/:id" component={WidgetPage} />
          <Route path="/analytics/:id" component={AnalyticsPage} />
        </Switch>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
} 