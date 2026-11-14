import React, { useState, useCallback } from 'react';
import LabReport from '@/components/LabReport';

interface Equation {
  id: number;
  label: string;
  reactants: { formula: string; elements: Record<string,number> }[];
  products:  { formula: string; elements: Record<string,number> }[];
  balanced:  number[];
}

const EQUATIONS: Equation[] = [
  {
    id:1, label:'Iron + Oxygen → Iron oxide',
    reactants:[{formula:'Fe',elements:{Fe:1}},{formula:'O₂',elements:{O:2}}],
    products: [{formula:'Fe₂O₃',elements:{Fe:2,O:3}}],
    balanced:[4,3,2],
  },
  {
    id:2, label:'Hydrogen + Oxygen → Water',
    reactants:[{formula:'H₂',elements:{H:2}},{formula:'O₂',elements:{O:2}}],
    products: [{formula:'H₂O',elements:{H:2,O:1}}],
    balanced:[2,1,2],
  },
  {
    id:3, label:'Methane combustion',
    reactants:[{formula:'CH₄',elements:{C:1,H:4}},{formula:'O₂',elements:{O:2}}],
    products: [{formula:'CO₂',elements:{C:1,O:2}},{formula:'H₂O',elements:{H:2,O:1}}],
    balanced:[1,2,1,2],
  },
  {
    id:4, label:'Sodium + Water → NaOH + H₂',
    reactants:[{formula:'Na',elements:{Na:1}},{formula:'H₂O',elements:{H:2,O:1}}],
    products: [{formula:'NaOH',elements:{Na:1,O:1,H:1}},{formula:'H₂',elements:{H:2}}],
    balanced:[2,2,2,1],
  },
  {
    id:5, label:'Aluminium + HCl',
    reactants:[{formula:'Al',elements:{Al:1}},{formula:'HCl',elements:{H:1,Cl:1}}],
    products: [{formula:'AlCl₃',elements:{Al:1,Cl:3}},{formula:'H₂',elements:{H:2}}],
    balanced:[2,6,2,3],
  },
  {
    id:6, label:'Nitrogen + Hydrogen → Ammonia (Haber)',
    reactants:[{formula:'N₂',elements:{N:2}},{formula:'H₂',elements:{H:2}}],
    products: [{formula:'NH₃',elements:{N:1,H:3}}],
    balanced:[1,3,2],
  },
];

function countAtoms(molecules: Equation['reactants'], coeffs: number[]): Record<string,number> {
  const tally: Record<string,number> = {};
  molecules.forEach((mol, i) => {
    Object.entries(mol.elements).forEach(([el, n]) => {
      tally[el] = (tally[el]||0) + coeffs[i] * n;
    });
  });
  return tally;
}

function atomTally(eq: Equation, coeffs: number[]) {
  const nR = eq.reactants.length;
  const rCoeffs = coeffs.slice(0, nR);
  const pCoeffs = coeffs.slice(nR);
  const rTally = countAtoms(eq.reactants, rCoeffs);
  const pTally = countAtoms(eq.products, pCoeffs);
  return { rTally, pTally };
}

function isBalanced(eq: Equation, coeffs: number[]): boolean {
  const { rTally, pTally } = atomTally(eq, coeffs);
  const allElements = new Set([...Object.keys(rTally), ...Object.keys(pTally)]);
  for (const el of allElements) {
    if ((rTally[el]||0) !== (pTally[el]||0)) return false;
  }
  return true;
}

const EL_COLORS: Record<string,string> = {
  H:'text-blue-400', O:'text-red-400', C:'text-slate-300',
  N:'text-purple-400', Fe:'text-orange-400', Na:'text-yellow-400',
  Al:'text-sky-400', Cl:'text-green-400', Ca:'text-amber-400',
};

export default function BalancingEqSim(): React.ReactElement {
  const [eqIdx,    setEqIdx]    = useState(0);
  const [coeffs,   setCoeffs]   = useState<number[]>([1,1,1,1]);
  const [revealed, setRevealed] = useState(false);
  const [solved,   setSolved]   = useState(false);
  const [streak,   setStreak]   = useState(0);

  const eq = EQUATIONS[eqIdx];
  const totalSlots = eq.reactants.length + eq.products.length;

  const setEq = useCallback((idx: number) => {
    setEqIdx(idx);
    setCoeffs(new Array(EQUATIONS[idx].reactants.length + EQUATIONS[idx].products.length).fill(1));
    setRevealed(false); setSolved(false);
  }, []);

  const updateCoeff = (i: number, delta: number) => {
    setCoeffs(prev => {
      const next = [...prev];
      next[i] = Math.max(1, Math.min(9, (next[i]||1) + delta));
      const bal = isBalanced(eq, next);
      setSolved(bal);
      if (bal) setStreak(s => s+1);
      return next;
    });
  };

  const reveal = () => {
    setCoeffs([...eq.balanced, ...new Array(totalSlots - eq.balanced.length).fill(1)].slice(0, totalSlots));
    setRevealed(true); setSolved(true);
  };

  const reset = () => {
    setCoeffs(new Array(totalSlots).fill(1));
    setRevealed(false); setSolved(false);
  };

  const { rTally, pTally } = atomTally(eq, coeffs);
  const allElements = Array.from(new Set([...Object.keys(rTally), ...Object.keys(pTally)]));

  const renderSide = (molecules: typeof eq.reactants, startIdx: number) => (
    <div className="flex items-center gap-1.5 flex-wrap justify-center">
      {molecules.map((mol, i) => {
        const ci = startIdx + i;
        const c = coeffs[ci] || 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-slate-500 text-sm">+</span>}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-0.5">
                <button onClick={()=>updateCoeff(ci,-1)} className="w-5 h-5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold leading-none flex items-center justify-center">−</button>
                <div className={`w-6 h-6 rounded text-sm font-bold flex items-center justify-center transition-colors ${c>1?'bg-orange-500/30 border border-orange-500/50 text-orange-300':'bg-slate-800 border border-slate-700 text-slate-300'}`}>{c}</div>
                <button onClick={()=>updateCoeff(ci,+1)} className="w-5 h-5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold leading-none flex items-center justify-center">+</button>
              </div>
              <span className="text-sm font-mono text-white px-2 py-0.5 bg-slate-800/60 rounded">{mol.formula}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Equation selector */}
      <div className="flex gap-2 flex-wrap">
        {EQUATIONS.map((e,i)=>(
          <button key={e.id} onClick={()=>setEq(i)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${i===eqIdx?'bg-violet-500/30 border border-violet-500/50 text-violet-300':'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600'}`}>
            {e.id}. {e.label.split('→')[0].trim()}
          </button>
        ))}
      </div>

      {/* Equation display */}
      <div className={`rounded-xl border p-6 transition-colors ${solved?'border-green-500/50 bg-green-500/5':'border-slate-700/60 bg-slate-800/30'}`}>
        <div className="text-xs text-slate-500 text-center mb-3">{eq.label}</div>
        <div className="flex items-center gap-3 justify-center flex-wrap">
          {renderSide(eq.reactants, 0)}
          <span className="text-slate-400 text-lg font-semibold">→</span>
          {renderSide(eq.products, eq.reactants.length)}
        </div>
        {solved && (
          <div className="mt-4 text-center text-green-400 font-bold text-sm animate-pulse">
            {revealed ? '✓ Equation revealed' : '✓ Correctly balanced!'}
          </div>
        )}
      </div>

      {/* Atom tally */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Atom count checker</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs">
                <th className="text-left py-1 pr-4">Element</th>
                <th className="text-center py-1 pr-4">Reactants</th>
                <th className="text-center py-1 pr-4">Products</th>
                <th className="text-center py-1">Match?</th>
              </tr>
            </thead>
            <tbody>
              {allElements.map(el => {
                const r = rTally[el]||0; const p = pTally[el]||0; const ok = r===p;
                return (
                  <tr key={el} className="border-t border-slate-700/30">
                    <td className={`py-1.5 pr-4 font-mono font-semibold ${EL_COLORS[el]||'text-slate-300'}`}>{el}</td>
                    <td className="text-center py-1.5 pr-4 font-mono text-white">{r}</td>
                    <td className="text-center py-1.5 pr-4 font-mono text-white">{p}</td>
                    <td className="text-center py-1.5">
                      <span className={`text-sm font-bold ${ok?'text-green-400':'text-red-400'}`}>{ok?'✓':'✗'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={`mt-3 text-xs font-semibold text-center ${isBalanced(eq,coeffs)?'text-green-400':'text-orange-400'}`}>
          {isBalanced(eq,coeffs) ? '✓ Law of conservation of mass satisfied' : '✗ Atom counts do not match — keep adjusting'}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={reveal} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition-colors">Show answer</button>
        <button onClick={reset} className="px-4 py-2 text-sm bg-slate-700 text-slate-200 rounded-lg font-semibold hover:bg-slate-600 transition-colors">Reset</button>
        {streak > 0 && <span className="text-xs text-green-400 font-semibold">🔥 Streak: {streak}</span>}
      </div>

      <LabReport
        labTitle="Balancing Chemical Equations"
        aim="To apply the law of conservation of mass by balancing chemical equations using correct stoichiometric coefficients."
        theory={`The law of conservation of mass states that atoms are neither created nor destroyed in a chemical reaction — only rearranged.\n\nTo balance an equation:\n1. Write the unbalanced equation\n2. Count atoms of each element on each side\n3. Adjust coefficients (whole numbers only — never change subscripts)\n4. Verify that all atom counts match\n\nThe balanced equation gives the mole ratio for calculations (stoichiometry).`}
        apparatus={['Virtual equation balancer','6 reaction types: combustion, formation, displacement','Atom tally checker']}
        variables={[{name:'Trial',desc:'Adjust +/− coefficients until all atoms balance'},{name:'Check',desc:'Atom count table shows which elements are unbalanced'}]}
        observations={allElements.map(el=>({ label:el, value:`${rTally[el]||0} ↔ ${pTally[el]||0}`, unit:(rTally[el]||0)===(pTally[el]||0)?'✓':'✗' }))}
        conclusion={`Current equation ${eq.label}: ${isBalanced(eq,coeffs)?'correctly balanced — all atom counts match.':'not yet balanced. Adjust coefficients until every row in the tally shows ✓.'} Balanced coefficients: [${eq.balanced.join(', ')}].`}
      />
    </div>
  );
}
