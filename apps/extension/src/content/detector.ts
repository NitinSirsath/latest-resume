import { BaseAdapter } from './adapters/base';
import { LinkedInAdapter } from './adapters/linkedin';
import { NaukriAdapter } from './adapters/naukri';
import { IndeedAdapter } from './adapters/indeed';
import { WellfoundAdapter } from './adapters/wellfound';
import { PortalType } from '@resumetailor/types';

export function getAdapterForPortal(portal: PortalType): BaseAdapter | null {
  switch (portal) {
    case 'linkedin':
      return new LinkedInAdapter();
    case 'naukri':
      return new NaukriAdapter();
    case 'indeed':
      return new IndeedAdapter();
    case 'wellfound':
      return new WellfoundAdapter();
    default:
      return null;
  }
}

export function detectPortal(): PortalType {
  const host = window.location.hostname;
  if (host.includes('linkedin.com')) return 'linkedin';
  if (host.includes('naukri.com')) return 'naukri';
  if (host.includes('indeed.com')) return 'indeed';
  if (host.includes('wellfound.com')) return 'wellfound';
  return 'unknown';
}
