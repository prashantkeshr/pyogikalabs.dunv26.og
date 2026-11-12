import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FlaskConical, Menu, X } from 'lucide-react';

const NAV = [
  { label: 'Labs',    to: '/labs' },
  { label: 'Physics', to: '/labs?subject=physics' },
  { label: 'Biology', to: '/labs?subject=biology' },
  { label: 'Chemistry', to: '/labs?subject=chemistry' },
  { label: 'Math',    to: '/labs?subject=math' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-bg/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-head font-semibold text-white hover:text-accent transition-colors">
          <span className="p-1.5 rounded-lg bg-orange-500/15 border border-orange-500/25">
            <FlaskConical size={18} className="text-orange-400" />
          </span>
          <span className="text-base tracking-tight">Prayogika</span>
          <span className="hidden sm:inline text-xs text-slate-500 font-normal ml-0.5">by Dhurta</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(n => (
            <Link
              key={n.to}
              to={n.to}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                loc.pathname === n.to.split('?')[0]
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 mr-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
            Free · No login
          </div>
          <Link
            to="/labs"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-400 text-white transition-colors"
          >
            Open a lab
          </Link>
          <button
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            onClick={() => setOpen(o => !o)}
            aria-label="Menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-800 bg-surface py-2 px-4">
          {NAV.map(n => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm text-slate-300 hover:text-white border-b border-slate-800/50 last:border-0"
            >
              {n.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
