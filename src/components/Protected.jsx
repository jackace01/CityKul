import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Protected({ children, memberOnly = false }) {
  const { user } = useAuth();
  const loc = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;

  if (memberOnly && !user.member) return <Navigate to="/membership" replace />;

  return children;
}
