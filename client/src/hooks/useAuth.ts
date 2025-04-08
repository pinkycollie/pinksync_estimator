import { useQuery } from "@tanstack/react-query";
import { getBaseUrl } from "../lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const logout = () => {
    const logoutUrl = `${getBaseUrl()}/api/logout`;
    window.location.href = logoutUrl;
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    logout,
  };
}