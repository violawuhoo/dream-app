import { useEffect, useRef, useState } from "react";
import { VeilText } from "./VeilText";

interface StreamingTextProps {
  text: string;
  chunkSize?: number;
  onComplete?: () => void;
}

export function StreamingText({ text, chunkSize = 3, onComplete }: StreamingTextProps) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (text.length <= indexRef.current) return;

    const animate = () => {
      if (indexRef.current >= text.length) {
        onCompleteRef.current?.();
        return;
      }
      const next = Math.min(indexRef.current + chunkSize, text.length);
      indexRef.current = next;
      setDisplayed(text.slice(0, next));
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [text, chunkSize]);

  return <VeilText variant="body">{displayed}</VeilText>;
}
