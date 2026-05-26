import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Returns the Clerk userId when the user is signed in via Apple/Google,
 * or the stable guest UUID stored in AsyncStorage for guest sessions.
 *
 * Returns null while the value is still loading (typically < 50 ms).
 */
export function useEffectiveUserId(): string | null {
  const { userId } = useAuth();
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      setGuestId(null); // signed-in user — clear any cached guest ID
      return;
    }
    AsyncStorage.getItem("veil_guest_id").then((id) => setGuestId(id));
  }, [userId]);

  return userId ?? guestId;
}
