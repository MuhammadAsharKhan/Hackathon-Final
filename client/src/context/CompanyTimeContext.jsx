import { createContext, useContext } from "react";
import { getSettings } from "@/api/settings.api";
import { useAuth } from "@/hooks/useAuth";
import { useResource } from "@/hooks/useResource";

const CompanyTimeContext = createContext(undefined);

// Settings are readable by admin and HR only, so an employee's clock falls back
// to the device zone and every other role reads times in the company zone.
export function CompanyTimeProvider({ children }) {
  const { user } = useAuth();
  const canReadSettings = user?.role === "admin" || user?.role === "hr";

  const { data } = useResource(
    () => (canReadSettings ? getSettings() : Promise.resolve(null)),
    [canReadSettings]
  );

  return (
    <CompanyTimeContext.Provider value={data?.settings?.timezone || undefined}>
      {children}
    </CompanyTimeContext.Provider>
  );
}

export const useCompanyTimeZone = () => useContext(CompanyTimeContext);
