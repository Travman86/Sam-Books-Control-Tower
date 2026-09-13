import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Layout } from '@/components/layout';
import Login from '@/pages/login';
import { useAuthStatus } from '@/hooks/use-auth';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/dashboard';
import Projects from '@/pages/projects';
import Policies from '@/pages/policies';
import Reviews from '@/pages/reviews';
import ReviewDetail from '@/pages/review-detail';
import Actions from '@/pages/actions';
import ActionDetail from '@/pages/action-detail';
import Activity from '@/pages/activity';
import SamBooksOverview from '@/pages/sam-books-overview';
import SamBooksProjects from '@/pages/sam-books-projects';
import SamBooksApprovals from '@/pages/sam-books-approvals';
import SamBooksApprovalDetail from '@/pages/sam-books-approval-detail';
import SamBooksAgentRuns from '@/pages/sam-books-agent-runs';
import SamBooksAgentRunDetail from '@/pages/sam-books-agent-run-detail';
import SamBooksPerformance from '@/pages/sam-books-performance';
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
          <Route path="/sam-books" component={SamBooksOverview} />
          <Route path="/sam-books/projects" component={SamBooksProjects} />
          <Route path="/sam-books/approvals" component={SamBooksApprovals} />
          <Route path="/sam-books/approvals/:id" component={SamBooksApprovalDetail} />
          <Route path="/sam-books/agent-runs" component={SamBooksAgentRuns} />
          <Route path="/sam-books/agent-runs/:id" component={SamBooksAgentRunDetail} />
          <Route path="/sam-books/performance" component={SamBooksPerformance} />
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

function FullScreenSpinner() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

/**
 * Single-admin gate: nothing in the app is reachable without a session.
 * Every /api/* route already enforces this server-side (see requireAuth in
 * app.ts) — this just keeps the UI from flashing the dashboard shell before
 * redirecting, and renders the actual login form.
 */
function AuthGate() {
  const { data, isLoading, isError } = useAuthStatus();

  if (isLoading) return <FullScreenSpinner />;
  if (isError || !data?.authenticated) return <Login />;
  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthGate />
        </WouterRouter>
        <Toaster />
        {/* Some pages (policies, projects, review-detail, and now the Sam
            Books decision flow) use sonner's `toast()` rather than the
            shadcn useToast hook — mount its Toaster too or those calls are
            silently invisible. */}
        <SonnerToaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
