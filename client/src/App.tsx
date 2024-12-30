import { Route, Switch } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import QueryProvider from '@/providers/QueryProvider';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import WidgetEmbed from '@/pages/WidgetEmbed';

export default function App() {
  return (
    <QueryProvider>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/widget/:id" component={WidgetEmbed} />
      </Switch>
      <Toaster />
    </QueryProvider>
  );
} 