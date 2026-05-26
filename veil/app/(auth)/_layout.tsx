import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Slot } from "expo-router";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  // Only redirect once Clerk has fully resolved AND confirmed the user is
  // signed in.  Rendering <Slot> before isLoaded keeps btn-apple visible
  // immediately and prevents the blank-screen hang that occurs when Clerk
  // is slow to initialise (or the publishable key isn't set in the build).
  if (isLoaded && isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Slot />;
}
