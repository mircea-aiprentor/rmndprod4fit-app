import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (user === null)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
        <Loader2 className="w-8 h-8 text-[#C4F601] animate-spin" aria-hidden="true" />
      </div>
    );
  if (user === false) return <Navigate to="/login" replace />;
  return children;
}
