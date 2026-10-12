import { createContext, type ReactNode, useContext } from "react";
import { Outlet } from "react-router";

const ChromeContext = createContext<ReactNode>(null);

export function ChromeProvider({ value, children }: { value: ReactNode; children: ReactNode }) {
  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export function RootFrame() {
  const chrome = useContext(ChromeContext);
  return (
    <>
      {chrome}
      <Outlet />
    </>
  );
}
