import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Custom domain configuration
const CUSTOM_DOMAIN = 'pinkyaihub.mbtquniverse.com';

// Check if we're on the custom domain
const isCustomDomain = () => {
  return window.location.hostname === CUSTOM_DOMAIN;
};

// Get the fully qualified base URL
export const getBaseUrl = (): string => {
  if (isCustomDomain()) {
    return `https://${CUSTOM_DOMAIN}`;
  }
  
  // Use the current origin as fallback
  return window.location.origin;
};

// Utility to handle API requests with custom domain support
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Enhanced API request function with custom domain support
export async function apiRequest<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  // Handle absolute URLs vs relative paths
  const fullUrl = url.startsWith('http') ? url : `${getBaseUrl()}${url}`;
  
  const res = await fetch(fullUrl, {
    credentials: "include",
    ...options,
  });

  await throwIfResNotOk(res);
  return await res.json() as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle URL construction for the custom domain
    const path = queryKey[0] as string;
    const fullUrl = path.startsWith('http') ? path : `${getBaseUrl()}${path}`;
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
