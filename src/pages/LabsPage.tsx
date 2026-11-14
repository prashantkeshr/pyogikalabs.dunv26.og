import { useSearchParams } from 'react-router-dom';
import LabsGrid from '@/components/LabsGrid';
import type { Subject } from '@/data/labs';
import { useSEO } from '@/hooks/useSEO';

export default function LabsPage() {
  const [params] = useSearchParams();
  const sub = params.get('subject') as Subject | null;

  useSEO({
    title: sub ? `${sub.charAt(0).toUpperCase() + sub.slice(1)} Labs` : 'All Science Labs',
    description: 'Browse 17+ free interactive science labs — Physics, Biology, Chemistry, and Mathematics simulations for CBSE, JEE, NEET, IGCSE, and IB students.',
    canonical: '/labs',
    keywords: 'virtual labs, science simulations, physics labs, chemistry labs, biology labs, math labs, CBSE, JEE, NEET, IGCSE, IB',
  });

  return (
    <main>
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-2">
        <div className="mb-2 text-xs text-slate-600 uppercase tracking-wider font-semibold font-head">Virtual Labs</div>
        <h1 className="font-head font-bold text-white text-2xl sm:text-3xl mb-2">
          {sub ? sub.charAt(0).toUpperCase() + sub.slice(1) + ' Labs' : 'All Labs'}
        </h1>
        <p className="text-slate-500 text-sm">Free interactive simulations — no login, no download.</p>
      </div>
      <LabsGrid initialSubject={sub ?? 'all'} />
    </main>
  );
}
