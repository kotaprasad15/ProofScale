import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface MaskedRevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function MaskedReveal({
  children,
  delay = 0,
  duration = 0.7,
  className = "",
  as: Component = "div"
}: MaskedRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px -10% 0px" });

  return (
    <Component className={`masked-line ${className}`} ref={ref}>
      <motion.div
        initial={{ y: "105%", opacity: 0 }}
        animate={isInView ? { y: 0, opacity: 1 } : { y: "105%", opacity: 0 }}
        transition={{
          duration,
          delay,
          ease: [0.16, 1, 0.3, 1]
        }}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </Component>
  );
}
