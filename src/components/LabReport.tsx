import { useState } from 'react';
import { ClipboardCopy, ChevronDown, ChevronUp, Check, BookOpen } from 'lucide-react';

export interface ReportObs {
  label: string;
  value: string | number;
  unit?: string;
}

interface LabReportProps {
  aim: string;
  theory: string;
  apparatus?: string[];
  variables?: { name: string; desc: string }[];
  observations: ReportObs[];
  conclusion: string;
  labTitle: string;
}

export default function LabReport({ aim, theory, apparatus, variables, observations, conclusion, labTitle }: LabReportProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const buildText = () => {
    const lines: string[] = [];
    lines.push(`LAB REPORT — ${labTitle}`);
    lines.push('='.repeat(50));
    lines.push('');
    lines.push('AIM');
    lines.push(aim);
    lines.push('');
    if (apparatus?.length) {
      lines.push('APPARATUS');
      apparatus.forEach(a => lines.push(`  • ${a}`));
      lines.push('');
    }
    lines.push('THEORY');
    lines.push(theory);
    lines.push('');
    if (variables?.length) {
      lines.push('VARIABLES');
      variables.forEach(v => lines.push(`  ${v.name}: ${v.desc}`));
      lines.push('');
    }
    lines.push('OBSERVATIONS & RESULTS');
    observations.forEach(o => {
      const val = o.unit ? `${o.value} ${o.unit}` : String(o.value);
      lines.push(`  ${o.label}: ${val}`);
    });
    lines.push('');
    lines.push('CONCLUSION');
    lines.push(conclusion);
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mt-6 rounded-xl border border-slate-800 bg-surface/40 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <BookOpen size={15} className="text-orange-400" />
          Lab Report &amp; Materials
          <span className="text-xs font-normal text-slate-500 ml-1">— copy for your manual</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-800">
          {/* Copy button */}
          <div className="flex justify-end mt-4 mb-4">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-300 text-sm font-medium hover:bg-orange-500/25 transition-all"
            >
              {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
              {copied ? 'Copied!' : 'Copy all to clipboard'}
            </button>
          </div>

          <div className="space-y-5">
            {/* Aim */}
            <Section title="Aim">
              <p className="text-slate-300 text-sm leading-relaxed">{aim}</p>
            </Section>

            {/* Apparatus */}
            {apparatus?.length ? (
              <Section title="Apparatus">
                <ul className="text-sm text-slate-300 space-y-1">
                  {apparatus.map((a, i) => <li key={i} className="flex gap-2"><span className="text-orange-500">•</span>{a}</li>)}
                </ul>
              </Section>
            ) : null}

            {/* Theory */}
            <Section title="Theory / Background">
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{theory}</p>
            </Section>

            {/* Variables */}
            {variables?.length ? (
              <Section title="Variables">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {variables.map((v, i) => (
                    <div key={i} className="bg-slate-800/50 rounded-lg px-3 py-2">
                      <div className="text-xs text-orange-400 font-semibold mb-0.5">{v.name}</div>
                      <div className="text-xs text-slate-400">{v.desc}</div>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {/* Observations */}
            <Section title="Observations &amp; Results">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {observations.map((o, i) => (
                  <div key={i} className="bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700/50">
                    <div className="text-xs text-slate-500 mb-0.5">{o.label}</div>
                    <div className="text-sm font-mono font-bold text-white">
                      {o.value}{o.unit ? <span className="text-xs text-slate-400 font-normal ml-1">{o.unit}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Conclusion */}
            <Section title="Conclusion">
              <p className="text-slate-300 text-sm leading-relaxed">{conclusion}</p>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}
