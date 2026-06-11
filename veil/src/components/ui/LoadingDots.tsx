import { useEffect, useState } from "react";
import { View } from "react-native";
import { colors } from "../../theme/tokens";

const DOT_SIZE = 6;
const STAGGER = 200;
const CYCLE_MS = 600;

function Dot({ delay }: { delay: number }) {
  const [bright, setBright] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    // Start the pulsing after the stagger delay.
    const starter = setTimeout(() => {
      setBright(true);
      timer = setInterval(() => setBright((v) => !v), CYCLE_MS);
    }, delay);
    return () => {
      clearTimeout(starter);
      clearInterval(timer);
    };
  }, []);

  return (
    <View
      style={{
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        backgroundColor: colors.textMuted,
        marginHorizontal: 3,
        opacity: bright ? 1 : 0.3,
      }}
    />
  );
}

export function LoadingDots() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
      <Dot delay={0} />
      <Dot delay={STAGGER} />
      <Dot delay={STAGGER * 2} />
    </View>
  );
}
