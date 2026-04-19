"use client";

import React, { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from "framer-motion";
import { cn } from "@/lib/utils";

export const CometCard = ({
  rotateDepth = 10,
  translateDepth = 14,
  className,
  children,
}) => {
  const ref = useRef(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 120, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 120, damping: 20 });

  const rotateX = useTransform(
    mouseYSpring,
    [-0.5, 0.5],
    [`-${rotateDepth}deg`, `${rotateDepth}deg`]
  );
  const rotateY = useTransform(
    mouseXSpring,
    [-0.5, 0.5],
    [`${rotateDepth}deg`, `-${rotateDepth}deg`]
  );

  const translateX = useTransform(
    mouseXSpring,
    [-0.5, 0.5],
    [`-${translateDepth}px`, `${translateDepth}px`]
  );
  const translateY = useTransform(
    mouseYSpring,
    [-0.5, 0.5],
    [`${translateDepth}px`, `-${translateDepth}px`]
  );

  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], [0, 100]);

  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(124,58,237,0.14) 0%, rgba(124,58,237,0.05) 40%, transparent 75%)`;

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect   = ref.current.getBoundingClientRect();
    const xPct   = (e.clientX - rect.left)  / rect.width  - 0.5;
    const yPct   = (e.clientY - rect.top)   / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className={cn("perspective-distant transform-3d w-full", className)}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          translateX,
          translateY,
          boxShadow:
            "0 0 0 1px rgba(124,58,237,0.10), 0 8px 40px rgba(124,58,237,0.14), 0 2px 10px rgba(124,58,237,0.08)",
        }}
        initial={{ scale: 1, z: 0 }}
        whileHover={{
          scale: 1.015,
          z: 40,
          transition: { duration: 0.2 },
        }}
        className="relative w-full rounded-2xl"
      >
        {children}
        {/* Glare overlay */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-50 rounded-2xl mix-blend-screen"
          style={{
            background: glareBackground,
            opacity: 0.8,
          }}
        />
      </motion.div>
    </div>
  );
};
