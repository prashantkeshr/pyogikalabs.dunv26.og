import { Link } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-surface">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid sm:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 font-head font-semibold text-white mb-3">
              <span className="p-1.5 rounded-lg bg-orange-500/15 border border-orange-500/25">
                <FlaskConical size={16} className="text-orange-400" />
              </span>
              Prayogika
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              प्रायोगिका — Free interactive science labs for IGCSE, CBSE, JEE/NEET, and IB students. No login. No cost.
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">Labs</div>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/lab/pendulum" className="hover:text-white transition-colors">Pendulum Lab</Link></li>
              <li><Link to="/lab/wave-interference" className="hover:text-white transition-colors">Wave Interference</Link></li>
              <li><Link to="/lab/molecule-vsepr" className="hover:text-white transition-colors">Molecular VSEPR</Link></li>
              <li><Link to="/lab/periodic-table" className="hover:text-white transition-colors">Periodic Table</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">Subjects</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/labs?subject=physics"   className="text-blue-400/70 hover:text-blue-300 transition-colors">Physics</Link></li>
              <li><Link to="/labs?subject=biology"   className="text-emerald-400/70 hover:text-emerald-300 transition-colors">Biology</Link></li>
              <li><Link to="/labs?subject=chemistry" className="text-orange-400/70 hover:text-orange-300 transition-colors">Chemistry</Link></li>
              <li><Link to="/labs?subject=math"      className="text-violet-400/70 hover:text-violet-300 transition-colors">Mathematics</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-600">
          <span>© 2026 Prayogika · <a href="https://dhurta.org" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors">Dhurta.Org</a></span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
            Free forever · No login required
          </span>
        </div>
      </div>
    </footer>
  );
}
