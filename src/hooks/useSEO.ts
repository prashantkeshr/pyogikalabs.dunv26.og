import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  keywords?: string;
}

const BASE_TITLE = 'Prayogika — Free Interactive Science Labs';
const BASE_URL   = 'https://prayogikalabs.dhurta.org';

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

function setOG(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', 'canonical'); document.head.appendChild(el); }
  el.setAttribute('href', href);
}

export function useSEO({ title, description, canonical, keywords }: SEOProps) {
  useEffect(() => {
    const pageTitle = title ? `${title} | Prayogika` : BASE_TITLE;
    document.title = pageTitle;

    if (description) {
      setMeta('description', description);
      setOG('og:description', description);
      setMeta('twitter:description', description);
    }
    if (keywords) setMeta('keywords', keywords);
    if (canonical) {
      const url = `${BASE_URL}${canonical}`;
      setCanonical(url);
      setOG('og:url', url);
    }
    setOG('og:title', pageTitle);
    setMeta('twitter:title', pageTitle);
  }, [title, description, canonical, keywords]);
}
