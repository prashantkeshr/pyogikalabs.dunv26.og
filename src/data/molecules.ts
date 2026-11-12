export interface Atom {
  element: string;
  position: [number, number, number];
  radius: number;
  color: string;
}

export interface Bond {
  from: number;
  to: number;
  order: 1 | 2 | 3;
}

export interface Molecule {
  id: string;
  formula: string;
  name: string;
  shape: string;
  bondAngle: string;
  hybridization: string;
  polarity: 'Polar' | 'Non-polar';
  lonePairs: string;
  atoms: Atom[];
  bonds: Bond[];
}

// Scale: 1 unit ≈ bond length ≈ displayed at ~65px
export const MOLECULES: Molecule[] = [
  {
    id: 'water',
    formula: 'H₂O',
    name: 'Water',
    shape: 'Bent (V-shaped)',
    bondAngle: '104.5°',
    hybridization: 'sp³',
    polarity: 'Polar',
    lonePairs: '2 on O',
    atoms: [
      { element: 'O', position: [0, 0, 0],         radius: 0.68, color: '#ff4040' },
      { element: 'H', position: [0.79, 0.61, 0],   radius: 0.42, color: '#e8e8e8' },
      { element: 'H', position: [-0.79, 0.61, 0],  radius: 0.42, color: '#e8e8e8' },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
    ],
  },
  {
    id: 'ammonia',
    formula: 'NH₃',
    name: 'Ammonia',
    shape: 'Trigonal Pyramidal',
    bondAngle: '107°',
    hybridization: 'sp³',
    polarity: 'Polar',
    lonePairs: '1 on N',
    atoms: [
      { element: 'N', position: [0, 0.25, 0],          radius: 0.65, color: '#4169e1' },
      { element: 'H', position: [0.95, -0.3, 0],       radius: 0.42, color: '#e8e8e8' },
      { element: 'H', position: [-0.47, -0.3, 0.82],   radius: 0.42, color: '#e8e8e8' },
      { element: 'H', position: [-0.47, -0.3, -0.82],  radius: 0.42, color: '#e8e8e8' },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
    ],
  },
  {
    id: 'methane',
    formula: 'CH₄',
    name: 'Methane',
    shape: 'Tetrahedral',
    bondAngle: '109.5°',
    hybridization: 'sp³',
    polarity: 'Non-polar',
    lonePairs: 'None',
    atoms: [
      { element: 'C', position: [0, 0, 0],               radius: 0.72, color: '#555' },
      { element: 'H', position: [0.76, 0.76, -0.76],     radius: 0.42, color: '#e8e8e8' },
      { element: 'H', position: [-0.76, -0.76, -0.76],   radius: 0.42, color: '#e8e8e8' },
      { element: 'H', position: [-0.76, 0.76, 0.76],     radius: 0.42, color: '#e8e8e8' },
      { element: 'H', position: [0.76, -0.76, 0.76],     radius: 0.42, color: '#e8e8e8' },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
      { from: 0, to: 4, order: 1 },
    ],
  },
  {
    id: 'co2',
    formula: 'CO₂',
    name: 'Carbon Dioxide',
    shape: 'Linear',
    bondAngle: '180°',
    hybridization: 'sp',
    polarity: 'Non-polar',
    lonePairs: '2 on each O',
    atoms: [
      { element: 'O', position: [-1.3, 0, 0], radius: 0.68, color: '#ff4040' },
      { element: 'C', position: [0, 0, 0],    radius: 0.72, color: '#555' },
      { element: 'O', position: [1.3, 0, 0],  radius: 0.68, color: '#ff4040' },
    ],
    bonds: [
      { from: 1, to: 0, order: 2 },
      { from: 1, to: 2, order: 2 },
    ],
  },
  {
    id: 'ethene',
    formula: 'C₂H₄',
    name: 'Ethene',
    shape: 'Trigonal Planar',
    bondAngle: '120°',
    hybridization: 'sp²',
    polarity: 'Non-polar',
    lonePairs: 'None',
    atoms: [
      { element: 'C', position: [-0.65, 0, 0],    radius: 0.72, color: '#555' },
      { element: 'C', position: [0.65, 0, 0],     radius: 0.72, color: '#555' },
      { element: 'H', position: [-1.25, 0.95, 0], radius: 0.42, color: '#e8e8e8' },
      { element: 'H', position: [-1.25,-0.95, 0], radius: 0.42, color: '#e8e8e8' },
      { element: 'H', position: [1.25, 0.95, 0],  radius: 0.42, color: '#e8e8e8' },
      { element: 'H', position: [1.25,-0.95, 0],  radius: 0.42, color: '#e8e8e8' },
    ],
    bonds: [
      { from: 0, to: 1, order: 2 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
      { from: 1, to: 4, order: 1 },
      { from: 1, to: 5, order: 1 },
    ],
  },
  {
    id: 'benzene',
    formula: 'C₆H₆',
    name: 'Benzene',
    shape: 'Hexagonal Planar',
    bondAngle: '120°',
    hybridization: 'sp²',
    polarity: 'Non-polar',
    lonePairs: 'None',
    atoms: [
      ...Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3;
        return { element: 'C', position: [Math.cos(a) * 1.4, Math.sin(a) * 1.4, 0] as [number,number,number], radius: 0.72, color: '#555' };
      }),
      ...Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3;
        return { element: 'H', position: [Math.cos(a) * 2.45, Math.sin(a) * 2.45, 0] as [number,number,number], radius: 0.42, color: '#e8e8e8' };
      }),
    ],
    bonds: [
      { from: 0, to: 1, order: 2 }, { from: 1, to: 2, order: 1 },
      { from: 2, to: 3, order: 2 }, { from: 3, to: 4, order: 1 },
      { from: 4, to: 5, order: 2 }, { from: 5, to: 0, order: 1 },
      { from: 0, to: 6, order: 1 }, { from: 1, to: 7, order: 1 },
      { from: 2, to: 8, order: 1 }, { from: 3, to: 9, order: 1 },
      { from: 4, to: 10, order: 1 }, { from: 5, to: 11, order: 1 },
    ],
  },
  {
    id: 'sf6',
    formula: 'SF₆',
    name: 'Sulfur Hexafluoride',
    shape: 'Octahedral',
    bondAngle: '90°',
    hybridization: 'sp³d²',
    polarity: 'Non-polar',
    lonePairs: 'None',
    atoms: [
      { element: 'S', position: [0, 0, 0],     radius: 0.9,  color: '#d4a000' },
      { element: 'F', position: [1.5, 0, 0],   radius: 0.5,  color: '#90e050' },
      { element: 'F', position: [-1.5, 0, 0],  radius: 0.5,  color: '#90e050' },
      { element: 'F', position: [0, 1.5, 0],   radius: 0.5,  color: '#90e050' },
      { element: 'F', position: [0, -1.5, 0],  radius: 0.5,  color: '#90e050' },
      { element: 'F', position: [0, 0, 1.5],   radius: 0.5,  color: '#90e050' },
      { element: 'F', position: [0, 0, -1.5],  radius: 0.5,  color: '#90e050' },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 }, { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 }, { from: 0, to: 4, order: 1 },
      { from: 0, to: 5, order: 1 }, { from: 0, to: 6, order: 1 },
    ],
  },
];
