import { Slot } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useOrchestrator } from "../../src/lib/useOrchestrator";
import { OrchestratorContext } from "../../src/lib/OrchestratorContext";

export default function DreamLayout() {
  const { userId, getToken } = useAuth();
  const orchestrator = useOrchestrator(userId ?? "", getToken);

  return (
    <OrchestratorContext.Provider value={orchestrator}>
      <Slot />
    </OrchestratorContext.Provider>
  );
}
