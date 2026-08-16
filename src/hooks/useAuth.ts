import { useSession } from 'next-auth/react';

export function useAuth() {
  const { data: session, status } = useSession();
  const user = session?.user;

  return {
    user,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  };
}