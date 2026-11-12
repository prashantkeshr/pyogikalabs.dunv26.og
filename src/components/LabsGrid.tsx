import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import { LABS, type Subject } from '@/data/labs';

const SUBJECTS: { id: Subject | 'all'; label: string; color: string }[] = [
  { id: 'all',       label: 'All Labs',  color: '#94a3b8' },
  { id: 'physics',   label: 'Physics',   color: '#60a5fa' },
  { id: 'biology',   label: 'Biology',   color: '#34d399' },
  { id: 'chemistry', label: 'Chemistry', color: '#fb923c' },
  { id: 'math',      label: 'Math',      color: '#a78bfa' },
];

const SUBJECT_ICONS: Record<Subject, string> = {
  physics:   '⚛',
  biology:   '🧬',
  chemistry: '⚗',
  math:      '∑',
};

const DIFFICULTY_DOT: Record<string, string> = {
  Foundation:    'bg-green-400',
  Intermediate:  'bg-yellow-400',
  Advanced:      'bg-red-400',
};

const BORDER: Record<Subject, string> = {
  physics:   'hover:border-blue-500/50',
  biology:   'hover:border-emerald-500/50',
  chemistry: 'hover:border-orange-500/50',
  math:      'hover:border-violet-500/50',
};

const BADGE: Record<Subject, string> = {
  physics:   'bg-blue-500/12 text-blue-300 border-blue-500/25',
  biology:   'bg-emerald-500/12 text-emerald-300 border-emerald-500/25',
  chemistry: 'bg-orange-500/12 text-orange-300 border-orange-500/25',
  math:      'bg-violet-500/12 text-violet-300 border-violet-500/25',
};

export default function LabsGrid({ initialSubject = 'all' }: { initialSubject?: Subject | 'all' }) {
  const [subject, setSubject] = useState<Subject | 'all'>(initialSubject);

  const filtered = subject === 'all' ? LABS : LABS.filter(l => l.subject === subject);
  const available = filtered.filter(l => l.available);
  const coming    = filtered.filter(l => !l.available);

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="mb-10">
        <h2 className="font-head font-bold text-white text-2xl sm:text-3xl mb-2">Virtual Labs</h2>
        <p className="text-slate-400">Hands-on simulations across all four science disciplines. Free, no login.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {SUBJECTS.map(s => (
          <button
            key={s.id}
            onClick={() => setSubject(s.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
              subject === s.id
                ? 'bg-surface2 border-slate-600 text-white'
                : 'border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
            style={subject === s.id ? { borderColor: s.color + '55', color: s.color } : {}}
          >
            {s.label}
            <span className="ml-1.5 text-xs opacity-60">
              {s.id === 'all' ? LABS.length : LABS.filter(l => l.subject === s.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Available labs */}
      {available.length > 0 && (
        <>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
            Live now
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
            {available.map(lab => (
              <Link
                key={lab.id}
                to={`/lab/${lab.id}`}
                className={`group flex flex-col gap-3 p-4 rounded-xl border border-slate-800 bg-surface hover:bg-surface2 ${BORDER[lab.subject]} transition-all`}
              >
                {/* Subject icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl border ${BADGE[lab.subject]}`}>
                  {SUBJECT_ICONS[lab.subject]}
                </div>

                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-1">
                    <h3 className="font-head font-semibold text-white text-sm leading-tight flex-1">{lab.title}</h3>
                    <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors mt-0.5 flex-shrink-0" />
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">{lab.description}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${BADGE[lab.subject]} capitalize`}>{lab.subject}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${DIFFICULTY_DOT[lab.difficulty]}`}></span>
                    {lab.difficulty}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {lab.syllabus.map(s => (
                    <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-500">{s}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Coming soon */}
      {coming.length > 0 && (
        <>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block"></span>
            Coming soon
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {coming.map(lab => (
              <div
                key={lab.id}
                className="flex flex-col gap-3 p-4 rounded-xl border border-slate-800/60 bg-surface/40 opacity-60"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl border ${BADGE[lab.subject]} opacity-50`}>
                  {SUBJECT_ICONS[lab.subject]}
                </div>
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-1">
                    <h3 className="font-head font-semibold text-slate-400 text-sm leading-tight flex-1">{lab.title}</h3>
                    <Lock size={12} className="text-slate-700 mt-0.5 flex-shrink-0" />
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">{lab.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${BADGE[lab.subject]} opacity-50 capitalize`}>{lab.subject}</span>
                  <span className="text-xs text-slate-700 ml-auto">In progress</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
