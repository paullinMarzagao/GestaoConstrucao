import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ProtocolsPage from "@/pages/protocols-page";
import RemittancesPage from "@/pages/remittances-page";
import TicketsPage from "@/pages/tickets-page";
import UsersPage from "@/pages/users-page";
import CostCentersPage from "@/pages/cost-centers-page";
import PayerEntitiesPage from "@/pages/payer-entities-page";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/protocolos" component={ProtocolsPage} />
      <ProtectedRoute path="/protocolos/novo" component={ProtocolsPage} />
      <ProtectedRoute path="/remessas" component={RemittancesPage} />
      <ProtectedRoute path="/chamados" component={TicketsPage} />
      <ProtectedRoute path="/usuarios" component={UsersPage} />
      <ProtectedRoute path="/centros-custo" component={CostCentersPage} />
      <ProtectedRoute path="/entidades-pagadoras" component={PayerEntitiesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
