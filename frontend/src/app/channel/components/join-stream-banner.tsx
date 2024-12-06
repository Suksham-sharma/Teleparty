import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";

export default function JoinStreamBanner({
  joinCode,
  copyToClipboard,
  copied,
}: {
  joinCode: string;
  copyToClipboard: (text: string) => void;
  copied: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-[#faedcd] flex items-center border border-gray-200 rounded-2xl shadow-lg overflow-hidden max-w-2xl mx-auto h-fit w-full"
    >
      <div className="px-8 py-4 bg-indigo-50/50 flex items-center justify-between h-fit w-full">
        <div className="flex flex-col gap-5 md:flex-row justify-between w-full">
          <div>
            <h2 className="text-xl md:text-start font-semibold text-indigo-800">
              Join Stream
            </h2>
            <p className="text-sm text-gray-500 mt-1 hidden md:block">
              Use this code to join the channel
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <code className="bg-[#ffffff] border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-mono text-base">
              {joinCode}
            </code>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => copyToClipboard(joinCode)}
              className={`
                  flex items-center justify-center py-2.5 rounded-lg transition-colors duration-300 px-3 min-w-36
                  ${
                    copied
                      ? "bg-green-800 text-white"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }
                `}
            >
              {copied ? (
                <>
                  <Check size={18} className="mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={18} className="mr-2" />
                  Copy Code
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
