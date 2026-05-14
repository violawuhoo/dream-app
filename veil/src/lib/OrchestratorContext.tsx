import { createContext, useContext } from "react";
import { useOrchestrator } from "./useOrchestrator";

type OrchestratorContextType = ReturnType<typeof useOrchestrator>;

const OrchestratorContext = createContext<OrchestratorContextType | null>(null);

export { OrchestratorContext };

export function useOrchestratorContext(): OrchestratorContextType {
  const ctx = useContext(OrchestratorContext);
  if (!ctx) throw new Error("useOrchestratorContext must be used within OrchestratorContext.Provider");
  return ctx;
}
