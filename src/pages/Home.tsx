import Hero from '@/components/Hero';
import LabsGrid from '@/components/LabsGrid';

export default function Home() {
  return (
    <main>
      <Hero />
      {/* Subjects stripe */}
      <div className="border-y border-slate-800 bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-wrap gap-6 items-center">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold font-head">Labs for</span>
          {[
            { label: 'Physics',   color: '#60a5fa', desc: 'Mechanics · Waves · Electricity' },
            { label: 'Biology',   color: '#34d399', desc: 'Cells · Genetics · Ecology' },
            { label: 'Chemistry', color: '#fb923c', desc: 'Bonding · Reactions · Kinetics' },
            { label: 'Math',      color: '#a78bfa', desc: 'Calculus · Statistics · Geometry' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }}></span>
              <span className="text-sm font-medium font-head" style={{ color: s.color }}>{s.label}</span>
              <span className="text-xs text-slate-600 hidden sm:inline">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
      <LabsGrid />
    </main>
  );
}
