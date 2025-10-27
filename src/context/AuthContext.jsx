import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getUser, setUser, clearUser, upgradeToMember } from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => getUser());

  // keep localStorage in sync with context
  useEffect(() => {
    if (user) setUser(user);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      login: (u) => setUserState(u),
      logout: () => {
        clearUser();
        setUserState(null);
      },
      upgrade: () => {
        upgradeToMember();
        setUserState((u) => ({ ...u, member: true }));
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
