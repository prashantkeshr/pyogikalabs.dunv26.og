import React, { lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LABS } from '@/data/labs';
import { useSEO } from '@/hooks/useSEO';

const SIMS: Record<string, React.LazyExoticComponent<() => React.ReactElement>> = {
  'pendulum':          lazy(() => import('@/components/sims/PendulumSim')),
  'wave-interference': lazy(() => import('@/components/sims/WaveSim')),
  'molecule-vsepr':    lazy(() => import('@/components/sims/MoleculeViewerFull')),
  'periodic-table':    lazy(() => import('@/components/sims/PeriodicTable')),
  'projectile':        lazy(() => import('@/components/sims/ProjectileSim')),
  'ohm-law':           lazy(() => import('@/components/sims/OhmSim')),
  'states-matter':     lazy(() => import('@/components/sims/StatesMatterSim')),
  'titration':         lazy(() => import('@/components/sims/TitrationSim')),
  'atom-builder':      lazy(() => import('@/components/sims/AtomBuilderSim')),
  'cell-structure':    lazy(() => import('@/components/sims/CellStructureSim')),
  'trig-circle':       lazy(() => import('@/components/sims/TrigCircleSim')),
  // 3D labs
  'dna-structure':          lazy(() => import('@/components/sims/DNASim')),
  'crystal-structure':      lazy(() => import('@/components/sims/CrystalSim')),
  'atomic-orbital':         lazy(() => import('@/components/sims/AtomicOrbitalSim')),
  'surface-plotter':        lazy(() => import('@/components/sims/SurfacePlotterSim')),
  'orbital-mechanics':      lazy(() => import('@/components/sims/OrbitalMechanicsSim')),
  'electric-field':         lazy(() => import('@/components/sims/ElectricField3DSim')),
  // New interactive labs
  'rutherford-scattering':  lazy(() => import('@/components/sims/RutherfordSim')),
  'fractional-distillation':lazy(() => import('@/components/sims/FractionalDistillationSim')),
  'cathode-ray':            lazy(() => import('@/components/sims/CathodeRaySim')),
  'electrolysis':           lazy(() => import('@/components/sims/ElectrolysisSim')),
  'rate-of-reaction':       lazy(() => import('@/components/sims/RateOfReactionSim')),
  'rusting':                lazy(() => import('@/components/sims/RustingSim')),
  'balancing-equations':    lazy(() => import('@/components/sims/BalancingEqSim')),
};

const SUBJECT_COLORS: Record<string, string> = {
  physics:   'text-blue-400 border-blue-500/30 bg-blue-500/10',
  biology:   'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  chemistry: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  math:      'text-violet-400 border-violet-500/30 bg-violet-500/10',
};

export default function LabPage() {
  const { id } = useParams<{ id: string }>();
  const lab = LABS.find(l => l.id === id);

  useSEO(lab ? {
    title: lab.title,
    description: `${lab.description} Interactive ${lab.subject} lab for ${lab.syllabus.join(', ')} students.`,
    canonical: `/lab/${lab.id}`,
    keywords: [...lab.tags, lab.subject, ...lab.syllabus, 'virtual lab', 'interactive simulation'].join(', '),
  } : {});

  if (!lab) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-4">🔬</div>
        <h1 className="font-head font-bold text-white text-xl mb-2">Lab not found</h1>
        <p className="text-slate-400 mb-6">This lab doesn't exist yet.</p>
        <Link to="/labs" className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1 justify-center">
          <ArrowLeft size={14} /> Back to all labs
        </Link>
      </main>
    );
  }

  if (!lab.available) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h1 className="font-head font-bold text-white text-xl mb-2">{lab.title}</h1>
        <p className="text-slate-400 mb-6">{lab.description}</p>
        <div className="inline-block px-3 py-1 rounded-full text-sm text-slate-500 border border-slate-700 mb-6">In progress</div>
        <div className="block"></div>
        <Link to="/labs" className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1 justify-center">
          <ArrowLeft size={14} /> See all available labs
        </Link>
      </main>
    );
  }

  const Sim = SIMS[lab.id];

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Link to="/labs" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors mb-6">
        <ArrowLeft size={14} /> All labs
      </Link>

      {/* Lab header */}
      <div className="flex flex-wrap items-start gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${SUBJECT_COLORS[lab.subject]}`}>
              {lab.subject}
            </span>
            <span className="text-xs text-slate-600">{lab.difficulty}</span>
            {lab.syllabus.map(s => (
              <span key={s} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-500">{s}</span>
            ))}
          </div>
          <h1 className="font-head font-bold text-white text-xl sm:text-2xl">{lab.title}</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">{lab.description}</p>
        </div>
      </div>

      {/* Simulation */}
      <div className="rounded-xl border border-slate-800 bg-surface p-4 sm:p-6">
        {Sim ? (
          <Suspense fallback={<div className="h-60 flex items-center justify-center text-slate-500 text-sm">Loading simulation…</div>}>
            <Sim />
          </Suspense>
        ) : (
          <div className="h-60 flex items-center justify-center text-slate-500">Simulation not found</div>
        )}
      </div>

      {/* Tags */}
      <div className="mt-4 flex flex-wrap gap-2">
        {lab.tags.map(t => (
          <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/50">{t}</span>
        ))}
      </div>
    </main>
  );
}
