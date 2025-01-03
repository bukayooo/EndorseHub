import { Route, Switch } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import QueryProvider from '@/providers/QueryProvider';
import DashboardPage from '@/pages/DashboardPage';
import AuthPage from '@/pages/AuthPage';
import HomePage from '@/pages/HomePage';

export default function App() {
  return (
    <QueryProvider>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/auth" component={AuthPage} />
      </Switch>
      <Toaster />
    </QueryProvider>
  );
} 