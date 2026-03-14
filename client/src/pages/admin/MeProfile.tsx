/**
 * Me Profile — sovereign-styled placeholder.
 * Matches chat: bg-slate-950, glass cards, indigo accents, rounded-sui.
 */
import { motion } from "framer-motion";
import { User } from "lucide-react";

export function MeProfile() {
  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-sui bg-slate-900/40 border border-indigo-500/20">
          <User className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Profile</h1>
          <p className="text-slate-400 text-sm">Your account and preferences.</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
        whileHover={{ scale: 1.02, y: -2 }}
        className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl shadow-2xl"
      >
        <p className="text-slate-400">Profile and security settings will be wired here. Same sovereign styling as chat.</p>
      </motion.div>
    </div>
  );
}
