'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useMusic } from '@/lib/contexts/MusicContext'

interface MusicToggleProps {
  ariaLabel: string
}

export default function MusicToggle({ ariaLabel }: MusicToggleProps) {
  const { isPlaying, toggleMusic } = useMusic()

  return (
    <motion.button
      onClick={toggleMusic}
      aria-label={ariaLabel}
      aria-pressed={isPlaying}
      className="relative w-[51px] h-[51px] rounded-full bg-white/65 border-[1.5px] border-white flex items-center justify-center hover:bg-white/80 transition-colors overflow-hidden"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <motion.div
        animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
        transition={isPlaying ? { duration: 3, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
      >
        <Image
          src="/images/vinyl-icon.png"
          alt=""
          width={33}
          height={33}
          className="w-[33px] h-[33px] object-contain"
        />
      </motion.div>

      {/* Playing indicator */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 bg-purple-start rounded-full"
                animate={{
                  height: [4, 12, 4],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
