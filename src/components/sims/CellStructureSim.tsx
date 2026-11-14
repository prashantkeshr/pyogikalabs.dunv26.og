import { useState } from 'react';
import LabReport from '@/components/LabReport';

type CellType = 'animal' | 'plant';

interface Organelle {
  id: string;
  label: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: string;
  borderColor: string;
  shape?: 'circle' | 'rect' | 'ellipse';
  animalOnly?: boolean;
  plantOnly?: boolean;
  description: string;
  function: string;
}

const ORGANELLES: Organelle[] = [
  {
    id: 'nucleus',
    label: 'Nucleus',
    x: 160, y: 160, rx: 38, ry: 32,
    color: '#7c3aed22', borderColor: '#7c3aed88',
    description: 'Control centre of the cell',
    function: 'Contains DNA, directs cell activities, controls protein synthesis',
  },
  {
    id: 'nucleolus',
    label: 'Nucleolus',
    x: 160, y: 158, rx: 14, ry: 12,
    color: '#6d28d955', borderColor: '#7c3aed',
    description: 'Dense region inside nucleus',
    function: 'Produces ribosomal RNA (rRNA) and assembles ribosomes',
  },
  {
    id: 'mitochondria',
    label: 'Mitochondria',
    x: 240, y: 100, rx: 24, ry: 14,
    color: '#dc262622', borderColor: '#ef4444aa',
    description: 'Powerhouse of the cell',
    function: 'Produces ATP through aerobic cellular respiration (Krebs cycle & oxidative phosphorylation)',
  },
  {
    id: 'er-rough',
    label: 'Rough ER',
    x: 110, y: 110, rx: 36, ry: 18,
    color: '#d9770622', borderColor: '#f97316aa',
    description: 'Endoplasmic reticulum studded with ribosomes',
    function: 'Protein synthesis (ribosomes) and processing, membrane production',
  },
  {
    id: 'er-smooth',
    label: 'Smooth ER',
    x: 85, y: 185, rx: 30, ry: 16,
    color: '#ea580c22', borderColor: '#f9731688',
    description: 'ER without ribosomes',
    function: 'Lipid synthesis, detoxification, calcium ion storage',
  },
  {
    id: 'golgi',
    label: 'Golgi Apparatus',
    x: 220, y: 195, rx: 32, ry: 14,
    color: '#0891b222', borderColor: '#06b6d4aa',
    description: 'Post office of the cell',
    function: 'Modifies, packages, and ships proteins and lipids to their destinations',
  },
  {
    id: 'lysosome',
    label: 'Lysosome',
    x: 270, y: 220, rx: 14, ry: 14,
    color: '#dc262622', borderColor: '#ef444488',
    animalOnly: true,
    description: 'Digestive vesicle (animal only)',
    function: 'Contains enzymes for breaking down waste materials, bacteria, and old organelles (autophagy)',
  },
  {
    id: 'ribosome',
    label: 'Ribosome',
    x: 190, y: 130, rx: 7, ry: 7,
    color: '#16a34a44', borderColor: '#4ade80',
    description: 'Tiny protein factory',
    function: 'Translates mRNA into proteins (site of protein synthesis)',
  },
  {
    id: 'centriole',
    label: 'Centriole',
    x: 130, y: 240, rx: 16, ry: 10,
    color: '#7c3aed22', borderColor: '#8b5cf688',
    animalOnly: true,
    description: 'Found near nucleus (animal only)',
    function: 'Organises mitotic spindle fibres during cell division',
  },
  {
    id: 'vacuole',
    label: 'Central Vacuole',
    x: 160, y: 165, rx: 70, ry: 65,
    color: '#0ea5e911', borderColor: '#38bdf888',
    plantOnly: true,
    description: 'Large water storage (plant only)',
    function: 'Maintains cell turgor pressure, stores nutrients and waste, helps maintain cell shape',
  },
  {
    id: 'chloroplast',
    label: 'Chloroplast',
    x: 85, y: 130, rx: 28, ry: 16,
    color: '#16a34a22', borderColor: '#4ade80aa',
    plantOnly: true,
    description: 'Site of photosynthesis (plant only)',
    function: 'Captures light energy to produce glucose from CO₂ and H₂O (photosynthesis)',
  },
  {
    id: 'cell-wall',
    label: 'Cell Wall',
    x: 160, y: 165, rx: 155, ry: 145,
    color: '#16a34a08', borderColor: '#4ade8044',
    plantOnly: true,
    description: 'Rigid outer layer (plant only)',
    function: 'Provides structural support, prevents over-expansion, made of cellulose',
  },
];

export default function CellStructureSim() {
  const [cellType, setCellType] = useState<CellType>('animal');
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const visibleOrganelles = ORGANELLES.filter(o => {
    if (o.animalOnly && cellType !== 'animal') return false;
    if (o.plantOnly && cellType !== 'plant') return false;
    return true;
  });

  const sel = selected ? ORGANELLES.find(o => o.id === selected) : null;

  const obs = visibleOrganelles
    .filter(o => o.id !== 'cell-wall' && o.id !== 'nucleolus')
    .map(o => ({ label: o.label, value: o.function }));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <span className="text-xs text-slate-500">Cell type:</span>
        {(['animal', 'plant'] as CellType[]).map(t => (
          <button key={t} onClick={() => { setCellType(t); setSelected(null); }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${cellType === t ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
            {t} cell
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={() => setZoom(z => Math.min(2, z + 0.25))} className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-sm border border-slate-700 hover:border-slate-500">+</button>
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-sm border border-slate-700 hover:border-slate-500">−</button>
          <span className="text-xs text-slate-500 self-center">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Cell SVG */}
        <div className="flex-1 min-w-0">
          <svg
            viewBox={`${160 - 165 / zoom} ${165 - 155 / zoom} ${330 / zoom} ${310 / zoom}`}
            className="w-full rounded-lg bg-[#080c18] cursor-pointer"
            style={{ height: 300 }}
            onClick={() => setSelected(null)}
          >
            {/* Cell membrane */}
            {cellType === 'animal' ? (
              <ellipse cx={160} cy={165} rx={148} ry={138} fill="#16a34a08" stroke="#4ade8055" strokeWidth={3} />
            ) : null}

            {/* Render organelles back to front */}
            {[...visibleOrganelles].reverse().map(o => (
              <g key={o.id} onClick={e => { e.stopPropagation(); setSelected(o.id === selected ? null : o.id); }}
                style={{ cursor: 'pointer' }}>
                <ellipse
                  cx={o.x} cy={o.y} rx={o.rx} ry={o.ry}
                  fill={selected === o.id ? o.color.replace('22', '44').replace('11', '22') : o.color}
                  stroke={selected === o.id ? o.borderColor.replace('88', 'dd').replace('aa', 'ff') : o.borderColor}
                  strokeWidth={selected === o.id ? 2 : 1}
                />
                {/* Label — only for larger organelles */}
                {o.rx > 14 && (
                  <text x={o.x} y={o.y + (o.ry > 20 ? 0 : 1)} textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(220,230,255,0.75)" fontSize={Math.max(7, Math.min(10, o.rx / 3.5))}
                    fontFamily="Inter, sans-serif" pointerEvents="none">
                    {o.label.split(' ')[0]}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* Info panel */}
        <div className="sm:w-64">
          {sel ? (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 h-full">
              <div className="font-semibold text-white text-sm mb-1">{sel.label}</div>
              <div className="text-xs text-slate-400 mb-3 italic">{sel.description}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Function</div>
              <div className="text-xs text-slate-300 leading-relaxed">{sel.function}</div>
              {sel.animalOnly && <div className="mt-3 text-xs text-orange-400 bg-orange-500/10 rounded px-2 py-1">Animal cell only</div>}
              {sel.plantOnly && <div className="mt-3 text-xs text-green-400 bg-green-500/10 rounded px-2 py-1">Plant cell only</div>}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 h-full flex flex-col justify-center">
              <div className="text-xs text-slate-500 text-center mb-3">Click an organelle to learn about it</div>
              <div className="space-y-1">
                {visibleOrganelles.filter(o => o.rx > 10).map(o => (
                  <button key={o.id} onClick={() => setSelected(o.id)}
                    className="w-full text-left text-xs px-2 py-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: o.borderColor }} />
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <LabReport
        labTitle={`${cellType === 'animal' ? 'Animal' : 'Plant'} Cell Structure`}
        aim={`To identify and describe the organelles of a ${cellType} cell, understand their functions, and compare animal and plant cells.`}
        theory={`Cells are the basic unit of life. Eukaryotic cells (animal and plant) have a membrane-bound nucleus and specialised organelles.\n\nAll eukaryotic cells have:\n• Nucleus (DNA), Mitochondria (ATP), ER (protein/lipid synthesis), Golgi (packaging), Ribosomes\n\nAnimal cells additionally have:\n• Lysosomes (digestion), Centrioles (cell division)\n\nPlant cells additionally have:\n• Cell wall (cellulose — structural support)\n• Chloroplasts (photosynthesis)\n• Central vacuole (turgor pressure)`}
        apparatus={['Microscope', 'Prepared cell slides (animal and plant)', 'Staining kit (iodine, methylene blue)', 'Coverslips', 'Drawing paper']}
        variables={[
          { name: 'Independent variable', desc: 'Cell type (animal vs plant)' },
          { name: 'Observed variable', desc: 'Organelles present and their appearance' },
        ]}
        observations={obs.slice(0, 10)}
        conclusion={`The ${cellType} cell contains ${visibleOrganelles.length} major structures. ${cellType === 'animal' ? 'Animal cells lack a cell wall and central vacuole but have lysosomes and centrioles. They are irregular in shape.' : 'Plant cells have a rigid cell wall, chloroplasts for photosynthesis, and a central vacuole that maintains turgor pressure.'} Both cell types share the nucleus, mitochondria, ribosomes, and endoplasmic reticulum.`}
      />
    </div>
  );
}
