import { useEffect, useRef, useState } from "react";

export default function AnimatedNumber({ value = 0, duration = 900, className = "", suffix = "" }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef();

  useEffect(() => {
    const target = Number(value) || 0;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <span className={className}>{display}{suffix}</span>;
}
