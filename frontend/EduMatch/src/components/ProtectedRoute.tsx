import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { UserRole } from "@/types/user";
import { ROUTES } from "@/lib/routes";
import { getDashboardPath, useAuth } from "@/hooks/useAuth";
import { LoadingPage } from "@/components/LoadingScreen";

type Props = {
  allowedRoles?: UserRole[];
};

export function ProtectedRoute({ allowedRoles }: Props) {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Outlet />;
}
