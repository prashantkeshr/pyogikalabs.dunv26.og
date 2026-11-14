import { useState } from 'react';
import LabReport from '@/components/LabReport';

interface Element {
  name: string;
  symbol: string;
  group: string;
  period: number;
  shellConfig: number[];
  block: string;
}

const ELEMENTS: Record<number, Element> = {
  1:  { name: 'Hydrogen',   symbol: 'H',  group: '1',  period: 1, shellConfig: [1],           block: 's' },
  2:  { name: 'Helium',     symbol: 'He', group: '18', period: 1, shellConfig: [2],           block: 's' },
  3:  { name: 'Lithium',    symbol: 'Li', group: '1',  period: 2, shellConfig: [2,1],         block: 's' },
  4:  { name: 'Beryllium',  symbol: 'Be', group: '2',  period: 2, shellConfig: [2,2],         block: 's' },
  5:  { name: 'Boron',      symbol: 'B',  group: '13', period: 2, shellConfig: [2,3],         block: 'p' },
  6:  { name: 'Carbon',     symbol: 'C',  group: '14', period: 2, shellConfig: [2,4],         block: 'p' },
  7:  { name: 'Nitrogen',   symbol: 'N',  group: '15', period: 2, shellConfig: [2,5],         block: 'p' },
  8:  { name: 'Oxygen',     symbol: 'O',  group: '16', period: 2, shellConfig: [2,6],         block: 'p' },
  9:  { name: 'Fluorine',   symbol: 'F',  group: '17', period: 2, shellConfig: [2,7],         block: 'p' },
  10: { name: 'Neon',       symbol: 'Ne', group: '18', period: 2, shellConfig: [2,8],         block: 'p' },
  11: { name: 'Sodium',     symbol: 'Na', group: '1',  period: 3, shellConfig: [2,8,1],       block: 's' },
  12: { name: 'Magnesium',  symbol: 'Mg', group: '2',  period: 3, shellConfig: [2,8,2],       block: 's' },
  13: { name: 'Aluminium',  symbol: 'Al', group: '13', period: 3, shellConfig: [2,8,3],       block: 'p' },
  14: { name: 'Silicon',    symbol: 'Si', group: '14', period: 3, shellConfig: [2,8,4],       block: 'p' },
  15: { name: 'Phosphorus', symbol: 'P',  group: '15', period: 3, shellConfig: [2,8,5],       block: 'p' },
  16: { name: 'Sulfur',     symbol: 'S',  group: '16', period: 3, shellConfig: [2,8,6],       block: 'p' },
  17: { name: 'Chlorine',   symbol: 'Cl', group: '17', period: 3, shellConfig: [2,8,7],       block: 'p' },
  18: { name: 'Argon',      symbol: 'Ar', group: '18', period: 3, shellConfig: [2,8,8],       block: 'p' },
  19: { name: 'Potassium',  symbol: 'K',  group: '1',  period: 4, shellConfig: [2,8,8,1],     block: 's' },
  20: { name: 'Calcium',    symbol: 'Ca', group: '2',  period: 4, shellConfig: [2,8,8,2],     block: 's' },
};

function getIonInfo(Z: number, el: Element): string {
  const outerShell = el.shellConfig[el.shellConfig.length - 1];
  const maxShell = [2, 8, 18, 32][el.shellConfig.length - 1] ?? 8;
  if (outerShell === maxShell) return 'Noble gas — stable (0)';
  if (outerShell <= 3) return `Loses ${outerShell} electron${outerShell > 1 ? 's' : ''} → ${el.symbol}${outerShell}⁺ ion`;
  const toFill = 8 - outerShell;
  if (toFill <= 3) return `Gains ${toFill} electron${toFill > 1 ? 's' : ''} → ${el.symbol}${toFill}⁻ ion`;
  return 'Variable ionic character';
}

function getElecConfig(shells: number[]) {
  const orbitals = ['1s', '2s', '2p', '3s', '3p', '4s'];
  const maxInOrbital = [2, 2, 6, 2, 6, 2];
  const result: string[] = [];
  let total = 0;
  for (let i = 0; i < shells.length; i++) {
    const shellElectrons = shells[i];
    // simplified: just show s and p
    if (shellElectrons <= 2) {
      result.push(`${orbitals[i * 2 < 6 ? i * 2 : i] || (i + 1) + 's'}${shellElectrons}`);
    } else {
      result.push(`${orbitals[i * 2 < 6 ? i * 2 : i] || (i + 1) + 's'}2`);
      result.push(`${orbitals[i * 2 + 1 < 6 ? i * 2 + 1 : i] || (i + 1) + 'p'}${shellElectrons - 2}`);
    }
    total += shellElectrons;
  }
  return result.join(' ');
}

export default function AtomBuilderSim() {
  const [protons, setProtons] = useState(6);
  const [neutrons, setNeutrons] = useState(6);

  const el = ELEMENTS[protons];
  const massNum = protons + neutrons;
  const valenceElectrons = el?.shellConfig[el.shellConfig.length - 1] ?? 0;
  const ionInfo = el ? getIonInfo(protons, el) : '';
  const elecConfig = el ? getElecConfig(el.shellConfig) : '';
  const isStable = protons <= 83 && neutrons >= protons * 0.9 && neutrons <= protons * 1.6;

  const shellRadii = [52, 88, 124, 160];
  const shellColors = ['#60a5fa', '#a78bfa', '#34d399', '#f97316'];

  const obs = [
    { label: 'Element', value: el ? `${el.name} (${el.symbol})` : `Unknown (Z=${protons})` },
    { label: 'Atomic number (Z)', value: protons },
    { label: 'Mass number (A)', value: massNum },
    { label: 'Neutrons (N)', value: neutrons },
    { label: 'Electron configuration', value: elecConfig || 'N/A' },
    { label: 'Valence electrons', value: valenceElectrons },
    { label: 'Ionic tendency', value: ionInfo || 'N/A' },
    { label: 'Nucleus stability', value: isStable ? 'Stable' : 'Unstable (may decay)' },
    { label: 'Period', value: el?.period ?? 'N/A' },
    { label: 'Group', value: el?.group ?? 'N/A' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Atom diagram */}
        <div className="flex-1">
          <div className="text-xs text-slate-500 mb-2">Shell Model</div>
          <svg viewBox="0 0 320 320" className="w-full max-w-xs mx-auto rounded-lg bg-[#080c18]" style={{ height: 280 }}>
            {/* Orbital rings */}
            {el?.shellConfig.map((_, i) => (
              <circle key={i} cx={160} cy={160} r={shellRadii[i]} fill="none"
                stroke={`${shellColors[i]}22`} strokeWidth={1.5} />
            ))}

            {/* Electrons on shells */}
            {el?.shellConfig.map((count, shellIdx) => {
              const r = shellRadii[shellIdx];
              return Array.from({ length: count }, (_, ei) => {
                const angle = (ei / count) * Math.PI * 2 - Math.PI / 2;
                const ex = 160 + r * Math.cos(angle);
                const ey = 160 + r * Math.sin(angle);
                return (
                  <g key={`${shellIdx}-${ei}`}>
                    <circle cx={ex} cy={ey} r={5} fill={shellColors[shellIdx] + 'dd'} />
                    <circle cx={ex - 1.5} cy={ey - 1.5} r={2} fill={shellColors[shellIdx] + '88'} />
                  </g>
                );
              });
            })}

            {/* Nucleus */}
            <circle cx={160} cy={160} r={28} fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.5)" strokeWidth={2} />
            {/* Protons */}
            {Array.from({ length: Math.min(protons, 10) }, (_, i) => {
              const ang = (i / Math.min(protons, 10)) * Math.PI * 2;
              const nr = protons > 5 ? 14 : 8;
              return (
                <circle key={`p${i}`} cx={160 + nr * Math.cos(ang)} cy={160 + nr * Math.sin(ang)} r={4}
                  fill="#f87171" stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />
              );
            })}
            {/* Neutrons */}
            {Array.from({ length: Math.min(neutrons, 10) }, (_, i) => {
              const ang = (i / Math.min(neutrons, 10)) * Math.PI * 2 + 0.3;
              const nr = neutrons > 5 ? 14 : 8;
              return (
                <circle key={`n${i}`} cx={160 + nr * Math.cos(ang)} cy={160 + nr * Math.sin(ang)} r={4}
                  fill="#94a3b8" stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />
              );
            })}

            {/* Element symbol */}
            <text x={160} y={163} textAnchor="middle" dominantBaseline="middle"
              fill="white" fontSize={el ? 15 : 12} fontWeight="bold" fontFamily="Inter, sans-serif">
              {el?.symbol ?? '?'}
            </text>
            <text x={160} y={184} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(150,170,200,0.6)" fontSize={9} fontFamily="Inter, sans-serif">
              {protons}p {neutrons}n
            </text>

            {/* Shell labels */}
            {el?.shellConfig.map((count, i) => (
              <text key={i} x={160 + shellRadii[i] + 8} y={165} fill={shellColors[i] + 'aa'} fontSize={9} fontFamily="Inter">
                {count}e
              </text>
            ))}

            {/* Legend */}
            <circle cx={18} cy={298} r={4} fill="#f87171" />
            <text x={26} y={302} fill="rgba(150,170,200,0.6)" fontSize={9} fontFamily="Inter">Proton</text>
            <circle cx={68} cy={298} r={4} fill="#94a3b8" />
            <text x={76} y={302} fill="rgba(150,170,200,0.6)" fontSize={9} fontFamily="Inter">Neutron</text>
            <circle cx={125} cy={298} r={4} fill={shellColors[0]} />
            <text x={133} y={302} fill="rgba(150,170,200,0.6)" fontSize={9} fontFamily="Inter">Electron</text>
          </svg>
        </div>

        {/* Info panel */}
        <div className="flex-1 space-y-3">
          {el ? (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-white">{el.symbol}</span>
                <span className="text-lg text-slate-400">{el.name}</span>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <div>Z = {protons} | A = {massNum} | N = {neutrons}</div>
                <div className="font-mono text-slate-300">{elecConfig}</div>
                <div>Group {el.group} | Period {el.period} | {el.block}-block</div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-500 text-sm">
              Element with Z = {protons} is beyond the data range
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
            <div className="text-xs text-slate-500 mb-1">Valence electrons</div>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${i < valenceElectrons ? 'bg-blue-500/30 border-blue-500/60 text-blue-300' : 'border-slate-700 text-slate-700'}`}>
                  {i < valenceElectrons ? '•' : ''}
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-400 mt-1.5">{ionInfo}</div>
          </div>

          <div className={`px-3 py-2 rounded-lg text-xs border ${isStable ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
            {isStable ? '✓ Stable nucleus' : '⚠ Unstable — may undergo radioactive decay'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Protons (Z): <span className="text-white font-mono">{protons}</span></label>
          <input type="range" min={1} max={20} value={protons} onChange={e => { setProtons(+e.target.value); setNeutrons(+e.target.value); }} className="w-full accent-red-500" />
          <div className="flex gap-2 mt-1">
            <button onClick={() => setProtons(p => Math.max(1, p - 1))} className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:border-slate-500">−p</button>
            <button onClick={() => setProtons(p => Math.min(20, p + 1))} className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:border-slate-500">+p</button>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Neutrons (N): <span className="text-white font-mono">{neutrons}</span></label>
          <input type="range" min={0} max={30} value={neutrons} onChange={e => setNeutrons(+e.target.value)} className="w-full accent-slate-400" />
          <div className="flex gap-2 mt-1">
            <button onClick={() => setNeutrons(n => Math.max(0, n - 1))} className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:border-slate-500">−n</button>
            <button onClick={() => setNeutrons(n => Math.min(30, n + 1))} className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:border-slate-500">+n</button>
          </div>
        </div>
      </div>

      {/* Quick element buttons */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[1, 2, 6, 7, 8, 11, 12, 17, 18, 20].map(z => {
          const e = ELEMENTS[z];
          return (
            <button key={z} onClick={() => { setProtons(z); setNeutrons(z); }}
              className={`px-2.5 py-1 rounded text-xs border transition-all ${protons === z ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
              {e.symbol}
            </button>
          );
        })}
      </div>

      <LabReport
        labTitle="Atom Builder"
        aim="To study atomic structure by building atoms and observing how the number of protons, neutrons, and electrons determines element identity, mass, electron configuration, and ionic behaviour."
        theory={`An atom consists of:\n• Nucleus: protons (charge +1) and neutrons (charge 0)\n• Electron shells: electrons (charge −1) orbiting the nucleus\n\nAtomic number (Z): number of protons — identifies the element\nMass number (A): Z + N (number of neutrons)\nIsotopes: same Z, different N\n\nElectron shells hold: 1st=2, 2nd=8, 3rd=18 electrons\nValence electrons (outer shell) determine chemical behaviour.\n\nIonic bonding:\n• Metals lose valence electrons → cations (+)\n• Non-metals gain electrons to fill outer shell → anions (−)\n• Noble gases have full shells — chemically inert`}
        apparatus={['Model atoms (balls for protons, neutrons, electrons)', 'Periodic table', 'Electron shell diagrams']}
        variables={[
          { name: 'Independent variable', desc: 'Number of protons and neutrons' },
          { name: 'Dependent variable', desc: 'Element identity, mass number, electron configuration, ionic tendency' },
          { name: 'Controlled variables', desc: 'Atomic model (Bohr shell model)' },
        ]}
        observations={obs}
        conclusion={`The atom built has Z=${protons} protons, ${neutrons} neutrons, and mass number A=${massNum}. ${el ? `This identifies the element as ${el.name} (${el.symbol}), in Period ${el.period}, Group ${el.group}. Electron configuration: ${elecConfig}. With ${valenceElectrons} valence electron${valenceElectrons !== 1 ? 's' : ''}, this element tends to ${ionInfo.toLowerCase()}.` : 'This element is beyond the first 20.'}`}
      />
    </div>
  );
}
