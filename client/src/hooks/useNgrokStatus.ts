import { useQuery } from "@tanstack/react-query";

interface NgrokStatus {
  active: boolean;
  url: string | null;
  message?: string;
  webInterface?: string;
  timestamp?: string;
}

export function useNgrokStatus() {
  const { data, isLoading, error, refetch } = useQuery<NgrokStatus>({
    queryKey: ["/api/system/ngrok"],
    refetchInterval: 30000, // Check every 30 seconds
  });
  
  return {
    ngrokStatus: data || { active: false, url: null },
    isLoading,
    error,
    refetch
  };
}