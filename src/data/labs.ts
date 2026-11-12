export type Subject = 'physics' | 'biology' | 'chemistry' | 'math';
export type Difficulty = 'Foundation' | 'Intermediate' | 'Advanced';

export interface Lab {
  id: string;
  title: string;
  subject: Subject;
  description: string;
  difficulty: Difficulty;
  tags: string[];
  available: boolean;
  syllabus: string[];
}

export const LABS: Lab[] = [
  // Physics
  {
    id: 'pendulum',
    title: 'Pendulum Lab',
    subject: 'physics',
    description: 'Explore simple harmonic motion. Adjust length and gravity — Earth, Moon, or Mars.',
    difficulty: 'Foundation',
    tags: ['SHM', 'Oscillation', 'Gravity'],
    available: true,
    syllabus: ['IGCSE', 'CBSE', 'JEE'],
  },
  {
    id: 'wave-interference',
    title: 'Wave Interference',
    subject: 'physics',
    description: 'Two-source interference — visualize constructive and destructive patterns in real time.',
    difficulty: 'Intermediate',
    tags: ['Waves', 'Superposition', 'Interference'],
    available: true,
    syllabus: ['IGCSE', 'CBSE', 'JEE'],
  },
  {
    id: 'projectile',
    title: 'Projectile Motion',
    subject: 'physics',
    description: 'Launch at any angle and speed. See range, height, and time of flight update live.',
    difficulty: 'Foundation',
    tags: ['Kinematics', 'Vectors', 'Motion'],
    available: false,
    syllabus: ['IGCSE', 'CBSE', 'JEE'],
  },
  {
    id: 'electric-field',
    title: 'Electric Field Visualizer',
    subject: 'physics',
    description: 'Place point charges and see field lines and equipotential surfaces form instantly.',
    difficulty: 'Advanced',
    tags: ['Electrostatics', 'Fields', 'Potential'],
    available: false,
    syllabus: ['CBSE', 'JEE', 'IB'],
  },
  {
    id: 'optics-ray',
    title: 'Ray Optics Lab',
    subject: 'physics',
    description: 'Lenses, mirrors, and prisms — trace rays through any optical setup.',
    difficulty: 'Intermediate',
    tags: ['Optics', 'Refraction', 'Lenses'],
    available: false,
    syllabus: ['IGCSE', 'CBSE', 'JEE'],
  },

  // Biology
  {
    id: 'cell-osmosis',
    title: 'Osmosis & Diffusion',
    subject: 'biology',
    description: 'Watch solutes move across a membrane. Change concentration and temperature.',
    difficulty: 'Foundation',
    tags: ['Cell', 'Transport', 'Osmosis'],
    available: false,
    syllabus: ['IGCSE', 'CBSE'],
  },
  {
    id: 'dna-structure',
    title: 'DNA Double Helix',
    subject: 'biology',
    description: 'Explore the 3D structure of DNA — base pairs, sugar-phosphate backbone, hydrogen bonds.',
    difficulty: 'Intermediate',
    tags: ['Genetics', 'DNA', 'Nucleotides'],
    available: false,
    syllabus: ['IGCSE', 'CBSE', 'NEET'],
  },
  {
    id: 'photosynthesis',
    title: 'Photosynthesis Rate',
    subject: 'biology',
    description: 'Vary light intensity, CO₂ concentration, and temperature — plot the rate live.',
    difficulty: 'Foundation',
    tags: ['Plants', 'Energy', 'Light'],
    available: false,
    syllabus: ['IGCSE', 'CBSE'],
  },
  {
    id: 'enzyme-kinetics',
    title: 'Enzyme Kinetics',
    subject: 'biology',
    description: 'Lock-and-key vs. induced fit — see how pH and temperature affect enzyme activity.',
    difficulty: 'Advanced',
    tags: ['Biochemistry', 'Enzymes', 'Kinetics'],
    available: false,
    syllabus: ['CBSE', 'NEET', 'IB'],
  },

  // Chemistry
  {
    id: 'molecule-vsepr',
    title: 'Molecular VSEPR Lab',
    subject: 'chemistry',
    description: 'Rotate molecules in 3D. Explore geometry, hybridization, polarity, and lone pairs.',
    difficulty: 'Intermediate',
    tags: ['VSEPR', 'Bonding', '3D Structure'],
    available: true,
    syllabus: ['IGCSE', 'CBSE', 'JEE', 'IB'],
  },
  {
    id: 'periodic-table',
    title: 'Interactive Periodic Table',
    subject: 'chemistry',
    description: 'All 118 elements. Click any element for full data, trends, electron configuration.',
    difficulty: 'Foundation',
    tags: ['Elements', 'Periodic Trends', 'Configuration'],
    available: true,
    syllabus: ['IGCSE', 'CBSE', 'JEE', 'NEET'],
  },
  {
    id: 'titration',
    title: 'Acid-Base Titration',
    subject: 'chemistry',
    description: 'High-fidelity burette simulator. Watch pH change as you add titrant drop by drop.',
    difficulty: 'Intermediate',
    tags: ['Titration', 'pH', 'Equilibrium'],
    available: false,
    syllabus: ['IGCSE', 'CBSE', 'JEE'],
  },
  {
    id: 'reaction-rates',
    title: 'Reaction Rate Explorer',
    subject: 'chemistry',
    description: 'Concentration, temperature, catalysts — control them all and watch rate graphs update.',
    difficulty: 'Advanced',
    tags: ['Kinetics', 'Rate Law', 'Activation Energy'],
    available: false,
    syllabus: ['CBSE', 'JEE', 'IB'],
  },

  // Math
  {
    id: 'function-plotter',
    title: 'Function Plotter',
    subject: 'math',
    description: 'Plot any function. Zoom, pan, find roots, intersections, and derivatives instantly.',
    difficulty: 'Foundation',
    tags: ['Functions', 'Graphs', 'Calculus'],
    available: false,
    syllabus: ['IGCSE', 'CBSE', 'JEE'],
  },
  {
    id: 'statistics-viz',
    title: 'Statistics Visualizer',
    subject: 'math',
    description: 'Normal, binomial, Poisson distributions — adjust parameters and see shapes shift live.',
    difficulty: 'Intermediate',
    tags: ['Statistics', 'Distributions', 'Probability'],
    available: false,
    syllabus: ['CBSE', 'JEE', 'IB'],
  },
  {
    id: 'geometry-explorer',
    title: 'Geometry Explorer',
    subject: 'math',
    description: 'Drag points and watch proofs hold — circles, triangles, conic sections.',
    difficulty: 'Foundation',
    tags: ['Geometry', 'Proofs', 'Coordinates'],
    available: false,
    syllabus: ['IGCSE', 'CBSE'],
  },
];
