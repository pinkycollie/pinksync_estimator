import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  sub: string;
  email?: string;
  username?: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string;
}

export function useAuth() {
  // Fetch the current auth state from the server
  const { data: user, isLoading, error, refetch } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Helper function to redirect to login
  const login = () => {
    window.location.href = '/api/login';
  };

  // Helper function to log out
  const logout = () => {
    window.location.href = '/api/logout';
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    refetch
  };
}