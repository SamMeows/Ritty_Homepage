import type { Dictionary } from '@/lib/i18n/dictionaries'

interface OfficialEntitySectionProps {
  dict: Dictionary
}

export default function OfficialEntitySection({ dict }: OfficialEntitySectionProps) {
  return (
    <section className="bg-gradient-to-b from-[#1a1520] to-[#0d0a12] py-8 px-4 text-center border-t border-b border-white/5">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-lg md:text-xl font-bold text-white mb-3 font-paperlogy">
          {dict.official.heading}
        </h2>
        <p className="text-sm text-gray-300 mb-3 leading-relaxed">
          <span className="font-semibold text-white">{dict.official.company}</span>
          {' | '}
          {dict.official.description}
        </p>
        <p className="text-xs text-gray-400">
          {dict.official.siteLabel}:{' '}
          <a
            href={dict.official.siteUrl}
            className="text-blue-400 hover:text-blue-300 underline transition-colors"
          >
            {dict.official.siteUrl}
          </a>
        </p>
      </div>
    </section>
  )
}
