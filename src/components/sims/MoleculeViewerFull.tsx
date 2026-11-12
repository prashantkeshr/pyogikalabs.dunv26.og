import { useState } from 'react';
import MoleculeViewer from './MoleculeViewer';
import { MOLECULES } from '@/data/molecules';

export default function MoleculeViewerFull() {
  const [idx, setIdx] = useState(0);
  const mol = MOLECULES[idx];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Viewer */}
      <div className="flex-1 min-w-0">
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#0a0d1a]">
          <div style={{ height: 360 }}>
            <MoleculeViewer molIdx={idx} onMolIdx={setIdx} />
          </div>
        </div>
        <p className="text-xs text-slate-600 text-center mt-2">Drag to rotate · Touch supported</p>
      </div>

      {/* Info panel */}
      <div className="lg:w-72 flex flex-col gap-3">
        <div className="rounded-xl border border-slate-800 bg-surface/60 p-3">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-head font-semibold">Select Molecule</div>
          <div className="flex flex-col gap-1">
            {MOLECULES.map((m, i) => (
              <button key={m.id} onClick={() => setIdx(i)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                  i === idx ? 'bg-orange-500/15 border border-orange-500/35 text-orange-200' : 'text-slate-400 hover:bg-slate-800/50 border border-transparent'
                }`}>
                <span className="font-mono font-bold text-sm w-12">{m.formula}</span>
                <span className="text-xs">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-surface/60 p-4 flex-1">
          <div className="text-lg font-bold font-head text-white mb-0.5">{mol.name}</div>
          <div className="text-sm font-mono text-orange-300 mb-4">{mol.formula}</div>
          <dl className="space-y-3">
            {([
              ['Shape', mol.shape],
              ['Bond Angle', mol.bondAngle],
              ['Hybridization', mol.hybridization],
              ['Polarity', mol.polarity],
              ['Lone Pairs', mol.lonePairs],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-500 mb-0.5">{k}</dt>
                <dd className={`text-sm font-medium ${k === 'Polarity' && v === 'Polar' ? 'text-blue-300' : 'text-white'}`}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
