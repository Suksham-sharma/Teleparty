"use client";

import { motion } from "framer-motion";

export function BackgroundAnimation() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-pink-100 to-blue-100"
        animate={{
          background: [
            "linear-gradient(to right, #fee2e2, #dbeafe)",
            "linear-gradient(to right, #dbeafe, #fee2e2)",
            "linear-gradient(to right, #fee2e2, #dbeafe)",
          ],
        }}
        transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
    </div>
  );
}
