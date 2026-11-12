import { useState } from 'react';

interface Element {
  number: number;
  symbol: string;
  name: string;
  mass: string;
  category: string;
  period: number;
  group: number;
  config: string;
  en: number | null;
  state: 'solid' | 'liquid' | 'gas' | 'unknown';
}

const CATEGORY_COLORS: Record<string, string> = {
  'alkali metal':        'bg-red-900/40 border-red-700/40 hover:bg-red-800/50 text-red-200',
  'alkaline earth metal':'bg-orange-900/40 border-orange-700/40 hover:bg-orange-800/50 text-orange-200',
  'transition metal':    'bg-yellow-900/40 border-yellow-700/40 hover:bg-yellow-800/50 text-yellow-200',
  'post-transition metal':'bg-green-900/40 border-green-700/40 hover:bg-green-800/50 text-green-200',
  'metalloid':           'bg-teal-900/40 border-teal-700/40 hover:bg-teal-800/50 text-teal-200',
  'nonmetal':            'bg-blue-900/40 border-blue-700/40 hover:bg-blue-800/50 text-blue-200',
  'halogen':             'bg-violet-900/40 border-violet-700/40 hover:bg-violet-800/50 text-violet-200',
  'noble gas':           'bg-pink-900/40 border-pink-700/40 hover:bg-pink-800/50 text-pink-200',
  'lanthanide':          'bg-rose-900/40 border-rose-700/40 hover:bg-rose-800/50 text-rose-200',
  'actinide':            'bg-fuchsia-900/40 border-fuchsia-700/40 hover:bg-fuchsia-800/50 text-fuchsia-200',
  'unknown':             'bg-slate-900/40 border-slate-700/40 hover:bg-slate-800/50 text-slate-400',
};

// Compact element data: [number, symbol, name, mass, category, period, group, config_abbrev, en, state]
const RAW: [number, string, string, string, string, number, number, string, number | null, 'solid' | 'liquid' | 'gas' | 'unknown'][] = [
  [1,'H','Hydrogen','1.008','nonmetal',1,1,'1s¹',2.20,'gas'],
  [2,'He','Helium','4.003','noble gas',1,18,'1s²',null,'gas'],
  [3,'Li','Lithium','6.941','alkali metal',2,1,'[He] 2s¹',0.98,'solid'],
  [4,'Be','Beryllium','9.012','alkaline earth metal',2,2,'[He] 2s²',1.57,'solid'],
  [5,'B','Boron','10.811','metalloid',2,13,'[He] 2s² 2p¹',2.04,'solid'],
  [6,'C','Carbon','12.011','nonmetal',2,14,'[He] 2s² 2p²',2.55,'solid'],
  [7,'N','Nitrogen','14.007','nonmetal',2,15,'[He] 2s² 2p³',3.04,'gas'],
  [8,'O','Oxygen','15.999','nonmetal',2,16,'[He] 2s² 2p⁴',3.44,'gas'],
  [9,'F','Fluorine','18.998','halogen',2,17,'[He] 2s² 2p⁵',3.98,'gas'],
  [10,'Ne','Neon','20.180','noble gas',2,18,'[He] 2s² 2p⁶',null,'gas'],
  [11,'Na','Sodium','22.990','alkali metal',3,1,'[Ne] 3s¹',0.93,'solid'],
  [12,'Mg','Magnesium','24.305','alkaline earth metal',3,2,'[Ne] 3s²',1.31,'solid'],
  [13,'Al','Aluminium','26.982','post-transition metal',3,13,'[Ne] 3s² 3p¹',1.61,'solid'],
  [14,'Si','Silicon','28.086','metalloid',3,14,'[Ne] 3s² 3p²',1.90,'solid'],
  [15,'P','Phosphorus','30.974','nonmetal',3,15,'[Ne] 3s² 3p³',2.19,'solid'],
  [16,'S','Sulfur','32.065','nonmetal',3,16,'[Ne] 3s² 3p⁴',2.58,'solid'],
  [17,'Cl','Chlorine','35.453','halogen',3,17,'[Ne] 3s² 3p⁵',3.16,'gas'],
  [18,'Ar','Argon','39.948','noble gas',3,18,'[Ne] 3s² 3p⁶',null,'gas'],
  [19,'K','Potassium','39.098','alkali metal',4,1,'[Ar] 4s¹',0.82,'solid'],
  [20,'Ca','Calcium','40.078','alkaline earth metal',4,2,'[Ar] 4s²',1.00,'solid'],
  [21,'Sc','Scandium','44.956','transition metal',4,3,'[Ar] 3d¹ 4s²',1.36,'solid'],
  [22,'Ti','Titanium','47.867','transition metal',4,4,'[Ar] 3d² 4s²',1.54,'solid'],
  [23,'V','Vanadium','50.942','transition metal',4,5,'[Ar] 3d³ 4s²',1.63,'solid'],
  [24,'Cr','Chromium','51.996','transition metal',4,6,'[Ar] 3d⁵ 4s¹',1.66,'solid'],
  [25,'Mn','Manganese','54.938','transition metal',4,7,'[Ar] 3d⁵ 4s²',1.55,'solid'],
  [26,'Fe','Iron','55.845','transition metal',4,8,'[Ar] 3d⁶ 4s²',1.83,'solid'],
  [27,'Co','Cobalt','58.933','transition metal',4,9,'[Ar] 3d⁷ 4s²',1.88,'solid'],
  [28,'Ni','Nickel','58.693','transition metal',4,10,'[Ar] 3d⁸ 4s²',1.91,'solid'],
  [29,'Cu','Copper','63.546','transition metal',4,11,'[Ar] 3d¹⁰ 4s¹',1.90,'solid'],
  [30,'Zn','Zinc','65.38','transition metal',4,12,'[Ar] 3d¹⁰ 4s²',1.65,'solid'],
  [31,'Ga','Gallium','69.723','post-transition metal',4,13,'[Ar] 3d¹⁰ 4s² 4p¹',1.81,'solid'],
  [32,'Ge','Germanium','72.630','metalloid',4,14,'[Ar] 3d¹⁰ 4s² 4p²',2.01,'solid'],
  [33,'As','Arsenic','74.922','metalloid',4,15,'[Ar] 3d¹⁰ 4s² 4p³',2.18,'solid'],
  [34,'Se','Selenium','78.971','nonmetal',4,16,'[Ar] 3d¹⁰ 4s² 4p⁴',2.55,'solid'],
  [35,'Br','Bromine','79.904','halogen',4,17,'[Ar] 3d¹⁰ 4s² 4p⁵',2.96,'liquid'],
  [36,'Kr','Krypton','83.798','noble gas',4,18,'[Ar] 3d¹⁰ 4s² 4p⁶',3.00,'gas'],
  [37,'Rb','Rubidium','85.468','alkali metal',5,1,'[Kr] 5s¹',0.82,'solid'],
  [38,'Sr','Strontium','87.62','alkaline earth metal',5,2,'[Kr] 5s²',0.95,'solid'],
  [39,'Y','Yttrium','88.906','transition metal',5,3,'[Kr] 4d¹ 5s²',1.22,'solid'],
  [40,'Zr','Zirconium','91.224','transition metal',5,4,'[Kr] 4d² 5s²',1.33,'solid'],
  [41,'Nb','Niobium','92.906','transition metal',5,5,'[Kr] 4d⁴ 5s¹',1.60,'solid'],
  [42,'Mo','Molybdenum','95.96','transition metal',5,6,'[Kr] 4d⁵ 5s¹',2.16,'solid'],
  [43,'Tc','Technetium','98','transition metal',5,7,'[Kr] 4d⁵ 5s²',1.90,'solid'],
  [44,'Ru','Ruthenium','101.07','transition metal',5,8,'[Kr] 4d⁷ 5s¹',2.20,'solid'],
  [45,'Rh','Rhodium','102.906','transition metal',5,9,'[Kr] 4d⁸ 5s¹',2.28,'solid'],
  [46,'Pd','Palladium','106.42','transition metal',5,10,'[Kr] 4d¹⁰',2.20,'solid'],
  [47,'Ag','Silver','107.868','transition metal',5,11,'[Kr] 4d¹⁰ 5s¹',1.93,'solid'],
  [48,'Cd','Cadmium','112.411','transition metal',5,12,'[Kr] 4d¹⁰ 5s²',1.69,'solid'],
  [49,'In','Indium','114.818','post-transition metal',5,13,'[Kr] 4d¹⁰ 5s² 5p¹',1.78,'solid'],
  [50,'Sn','Tin','118.710','post-transition metal',5,14,'[Kr] 4d¹⁰ 5s² 5p²',1.96,'solid'],
  [51,'Sb','Antimony','121.760','metalloid',5,15,'[Kr] 4d¹⁰ 5s² 5p³',2.05,'solid'],
  [52,'Te','Tellurium','127.60','metalloid',5,16,'[Kr] 4d¹⁰ 5s² 5p⁴',2.10,'solid'],
  [53,'I','Iodine','126.904','halogen',5,17,'[Kr] 4d¹⁰ 5s² 5p⁵',2.66,'solid'],
  [54,'Xe','Xenon','131.293','noble gas',5,18,'[Kr] 4d¹⁰ 5s² 5p⁶',2.60,'gas'],
  [55,'Cs','Caesium','132.905','alkali metal',6,1,'[Xe] 6s¹',0.79,'solid'],
  [56,'Ba','Barium','137.327','alkaline earth metal',6,2,'[Xe] 6s²',0.89,'solid'],
  [57,'La','Lanthanum','138.905','lanthanide',6,3,'[Xe] 5d¹ 6s²',1.10,'solid'],
  [58,'Ce','Cerium','140.116','lanthanide',8,0,'[Xe] 4f¹ 5d¹ 6s²',1.12,'solid'],
  [59,'Pr','Praseodymium','140.908','lanthanide',8,0,'[Xe] 4f³ 6s²',1.13,'solid'],
  [60,'Nd','Neodymium','144.242','lanthanide',8,0,'[Xe] 4f⁴ 6s²',1.14,'solid'],
  [61,'Pm','Promethium','145','lanthanide',8,0,'[Xe] 4f⁵ 6s²',null,'solid'],
  [62,'Sm','Samarium','150.36','lanthanide',8,0,'[Xe] 4f⁶ 6s²',1.17,'solid'],
  [63,'Eu','Europium','151.964','lanthanide',8,0,'[Xe] 4f⁷ 6s²',null,'solid'],
  [64,'Gd','Gadolinium','157.25','lanthanide',8,0,'[Xe] 4f⁷ 5d¹ 6s²',1.20,'solid'],
  [65,'Tb','Terbium','158.925','lanthanide',8,0,'[Xe] 4f⁹ 6s²',null,'solid'],
  [66,'Dy','Dysprosium','162.500','lanthanide',8,0,'[Xe] 4f¹⁰ 6s²',1.22,'solid'],
  [67,'Ho','Holmium','164.930','lanthanide',8,0,'[Xe] 4f¹¹ 6s²',1.23,'solid'],
  [68,'Er','Erbium','167.259','lanthanide',8,0,'[Xe] 4f¹² 6s²',1.24,'solid'],
  [69,'Tm','Thulium','168.934','lanthanide',8,0,'[Xe] 4f¹³ 6s²',1.25,'solid'],
  [70,'Yb','Ytterbium','173.054','lanthanide',8,0,'[Xe] 4f¹⁴ 6s²',null,'solid'],
  [71,'Lu','Lutetium','174.967','lanthanide',8,0,'[Xe] 4f¹⁴ 5d¹ 6s²',1.27,'solid'],
  [72,'Hf','Hafnium','178.49','transition metal',6,4,'[Xe] 4f¹⁴ 5d² 6s²',1.30,'solid'],
  [73,'Ta','Tantalum','180.948','transition metal',6,5,'[Xe] 4f¹⁴ 5d³ 6s²',1.50,'solid'],
  [74,'W','Tungsten','183.84','transition metal',6,6,'[Xe] 4f¹⁴ 5d⁴ 6s²',2.36,'solid'],
  [75,'Re','Rhenium','186.207','transition metal',6,7,'[Xe] 4f¹⁴ 5d⁵ 6s²',1.90,'solid'],
  [76,'Os','Osmium','190.23','transition metal',6,8,'[Xe] 4f¹⁴ 5d⁶ 6s²',2.20,'solid'],
  [77,'Ir','Iridium','192.217','transition metal',6,9,'[Xe] 4f¹⁴ 5d⁷ 6s²',2.20,'solid'],
  [78,'Pt','Platinum','195.084','transition metal',6,10,'[Xe] 4f¹⁴ 5d⁹ 6s¹',2.28,'solid'],
  [79,'Au','Gold','196.967','transition metal',6,11,'[Xe] 4f¹⁴ 5d¹⁰ 6s¹',2.54,'solid'],
  [80,'Hg','Mercury','200.592','transition metal',6,12,'[Xe] 4f¹⁴ 5d¹⁰ 6s²',2.00,'liquid'],
  [81,'Tl','Thallium','204.383','post-transition metal',6,13,'[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹',1.62,'solid'],
  [82,'Pb','Lead','207.2','post-transition metal',6,14,'[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²',2.33,'solid'],
  [83,'Bi','Bismuth','208.980','post-transition metal',6,15,'[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³',2.02,'solid'],
  [84,'Po','Polonium','209','metalloid',6,16,'[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴',2.00,'solid'],
  [85,'At','Astatine','210','halogen',6,17,'[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵',2.20,'solid'],
  [86,'Rn','Radon','222','noble gas',6,18,'[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶',null,'gas'],
  [87,'Fr','Francium','223','alkali metal',7,1,'[Rn] 7s¹',0.70,'solid'],
  [88,'Ra','Radium','226','alkaline earth metal',7,2,'[Rn] 7s²',0.90,'solid'],
  [89,'Ac','Actinium','227','actinide',7,3,'[Rn] 6d¹ 7s²',1.10,'solid'],
  [90,'Th','Thorium','232.038','actinide',9,0,'[Rn] 6d² 7s²',1.30,'solid'],
  [91,'Pa','Protactinium','231.036','actinide',9,0,'[Rn] 5f² 6d¹ 7s²',1.50,'solid'],
  [92,'U','Uranium','238.029','actinide',9,0,'[Rn] 5f³ 6d¹ 7s²',1.38,'solid'],
  [93,'Np','Neptunium','237','actinide',9,0,'[Rn] 5f⁴ 6d¹ 7s²',1.36,'solid'],
  [94,'Pu','Plutonium','244','actinide',9,0,'[Rn] 5f⁶ 7s²',1.28,'solid'],
  [95,'Am','Americium','243','actinide',9,0,'[Rn] 5f⁷ 7s²',1.13,'solid'],
  [96,'Cm','Curium','247','actinide',9,0,'[Rn] 5f⁷ 6d¹ 7s²',1.28,'solid'],
  [97,'Bk','Berkelium','247','actinide',9,0,'[Rn] 5f⁹ 7s²',1.30,'solid'],
  [98,'Cf','Californium','251','actinide',9,0,'[Rn] 5f¹⁰ 7s²',1.30,'solid'],
  [99,'Es','Einsteinium','252','actinide',9,0,'[Rn] 5f¹¹ 7s²',1.30,'solid'],
  [100,'Fm','Fermium','257','actinide',9,0,'[Rn] 5f¹² 7s²',1.30,'solid'],
  [101,'Md','Mendelevium','258','actinide',9,0,'[Rn] 5f¹³ 7s²',1.30,'solid'],
  [102,'No','Nobelium','259','actinide',9,0,'[Rn] 5f¹⁴ 7s²',1.30,'solid'],
  [103,'Lr','Lawrencium','266','actinide',9,0,'[Rn] 5f¹⁴ 7s² 7p¹',null,'solid'],
  [104,'Rf','Rutherfordium','267','transition metal',7,4,'[Rn] 5f¹⁴ 6d² 7s²',null,'solid'],
  [105,'Db','Dubnium','268','transition metal',7,5,'[Rn] 5f¹⁴ 6d³ 7s²',null,'solid'],
  [106,'Sg','Seaborgium','271','transition metal',7,6,'[Rn] 5f¹⁴ 6d⁴ 7s²',null,'solid'],
  [107,'Bh','Bohrium','272','transition metal',7,7,'[Rn] 5f¹⁴ 6d⁵ 7s²',null,'solid'],
  [108,'Hs','Hassium','270','transition metal',7,8,'[Rn] 5f¹⁴ 6d⁶ 7s²',null,'solid'],
  [109,'Mt','Meitnerium','278','unknown',7,9,'[Rn] 5f¹⁴ 6d⁷ 7s²',null,'unknown'],
  [110,'Ds','Darmstadtium','281','unknown',7,10,'[Rn] 5f¹⁴ 6d⁸ 7s²',null,'unknown'],
  [111,'Rg','Roentgenium','282','unknown',7,11,'[Rn] 5f¹⁴ 6d⁹ 7s²',null,'unknown'],
  [112,'Cn','Copernicium','285','transition metal',7,12,'[Rn] 5f¹⁴ 6d¹⁰ 7s²',null,'unknown'],
  [113,'Nh','Nihonium','286','post-transition metal',7,13,'[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹',null,'unknown'],
  [114,'Fl','Flerovium','289','post-transition metal',7,14,'[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²',null,'unknown'],
  [115,'Mc','Moscovium','290','unknown',7,15,'[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³',null,'unknown'],
  [116,'Lv','Livermorium','293','unknown',7,16,'[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴',null,'unknown'],
  [117,'Ts','Tennessine','294','halogen',7,17,'[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵',null,'unknown'],
  [118,'Og','Oganesson','294','noble gas',7,18,'[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶',null,'unknown'],
];

const ELEMENTS: Element[] = RAW.map(r => ({
  number: r[0], symbol: r[1], name: r[2], mass: r[3],
  category: r[4], period: r[5], group: r[6],
  config: r[7], en: r[8], state: r[9],
}));

function ElCell({ el, onClick, selected }: { el: Element; onClick: () => void; selected: boolean }) {
  const cls = CATEGORY_COLORS[el.category] ?? CATEGORY_COLORS['unknown'];
  return (
    <button
      onClick={onClick}
      title={el.name}
      className={`relative flex flex-col items-center justify-center p-0.5 rounded border text-center transition-all cursor-pointer ${cls} ${selected ? 'ring-1 ring-white/60 scale-105 z-10' : ''}`}
      style={{ width: '100%', aspectRatio: '1', fontSize: 'clamp(5px, 1.1vw, 11px)' }}
    >
      <span style={{ fontSize: '0.65em', opacity: 0.6 }}>{el.number}</span>
      <span style={{ fontSize: '1.4em', fontWeight: 700, lineHeight: 1 }}>{el.symbol}</span>
      <span style={{ fontSize: '0.5em', opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{el.name}</span>
    </button>
  );
}

export default function PeriodicTable() {
  const [selected, setSelected] = useState<Element | null>(ELEMENTS[0]);

  // Build grid: 7 rows × 18 cols
  const grid: (Element | null)[][] = Array.from({ length: 7 }, () => Array(18).fill(null));
  const lanthanides: Element[] = [];
  const actinides:   Element[] = [];

  for (const el of ELEMENTS) {
    if (el.period === 8) { lanthanides.push(el); continue; }
    if (el.period === 9) { actinides.push(el);   continue; }
    if (el.group > 0 && el.period >= 1 && el.period <= 7) {
      grid[el.period - 1][el.group - 1] = el;
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Selected element info */}
      {selected && (
        <div className="rounded-xl border border-orange-500/25 bg-orange-500/8 p-4 flex gap-4 items-start">
          <div className="text-center min-w-[64px]">
            <div className="text-xs text-slate-500">{selected.number}</div>
            <div className="text-3xl font-bold text-orange-300 font-head">{selected.symbol}</div>
            <div className="text-xs text-slate-400">{selected.mass}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-white font-head">{selected.name}</div>
            <div className="text-xs text-slate-400 mt-0.5 capitalize">{selected.category}</div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-slate-500">Configuration</span><span className="text-slate-200 font-mono">{selected.config}</span>
              <span className="text-slate-500">Electronegativity</span><span className="text-slate-200">{selected.en ?? '—'}</span>
              <span className="text-slate-500">Period / Group</span><span className="text-slate-200">{selected.period} / {selected.group || '—'}</span>
              <span className="text-slate-500">State at 25°C</span><span className="text-slate-200 capitalize">{selected.state}</span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(18, minmax(0, 1fr))', gap: 2, minWidth: 540 }}>
          {grid.map((row, ri) =>
            row.map((el, ci) => {
              if (!el) {
                // La/Ac placeholders
                if (ri === 5 && ci === 2) return <div key={`${ri}-${ci}`} className="rounded border border-rose-800/30 bg-rose-900/20 opacity-50" style={{ aspectRatio: '1' }} title="Lanthanides 57–71" />;
                if (ri === 6 && ci === 2) return <div key={`${ri}-${ci}`} className="rounded border border-fuchsia-800/30 bg-fuchsia-900/20 opacity-50" style={{ aspectRatio: '1' }} title="Actinides 89–103" />;
                return <div key={`${ri}-${ci}`} />;
              }
              return <ElCell key={el.number} el={el} selected={selected?.number === el.number} onClick={() => setSelected(el)} />;
            })
          )}
        </div>

        {/* Lanthanides */}
        <div className="mt-2 grid gap-0.5" style={{ display: 'grid', gridTemplateColumns: 'repeat(15, minmax(0, 1fr))', gap: 2, minWidth: 540, marginLeft: `calc(2 * (100% / 18 + 2px))` }}>
          {lanthanides.map(el => <ElCell key={el.number} el={el} selected={selected?.number === el.number} onClick={() => setSelected(el)} />)}
        </div>
        {/* Actinides */}
        <div className="mt-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(15, minmax(0, 1fr))', gap: 2, minWidth: 540, marginLeft: `calc(2 * (100% / 18 + 2px))` }}>
          {actinides.map(el => <ElCell key={el.number} el={el} selected={selected?.number === el.number} onClick={() => setSelected(el)} />)}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs mt-1">
        {Object.entries(CATEGORY_COLORS).filter(([k]) => k !== 'unknown').map(([cat, cls]) => (
          <span key={cat} className={`px-2 py-0.5 rounded border capitalize ${cls}`}>{cat}</span>
        ))}
      </div>
    </div>
  );
}
