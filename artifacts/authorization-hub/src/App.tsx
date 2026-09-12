import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Layout } from '@/components/layout';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/dashboard';
import Projects from '@/pages/projects';
import Policies from '@/pages/policies';
import Reviews from '@/pages/reviews';
import ReviewDetail from '@/pages/review-detail';
import Actions from '@/pages/actions';
import ActionDetail from '@/pages/action-detail';
import Activity from '@/pages/activity';
import SamBooks from '@/pages/sam-books';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/policies" component={Policies} />
          <Route path="/reviews" component={Reviews} />
          <Route path="/reviews/:id" component={ReviewDetail} />
          <Route path="/actions" component={Actions} />
          <Route path="/actions/:id" component={ActionDetail} />
          <Route path="/activity" component={Activity} />
          <Route path="/sam-books" component={SamBooks} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Layout>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
