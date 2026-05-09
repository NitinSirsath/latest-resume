import { BaseAdapter } from './adapters/base';
import { LinkedInAdapter } from './adapters/linkedin';
import { NaukriAdapter } from './adapters/naukri';
import { IndeedAdapter } from './adapters/indeed';
import { WellfoundAdapter } from './adapters/wellfound';
import { GreenhouseAdapter } from './adapters/greenhouse';
import { LeverAdapter } from './adapters/lever';
import { WorkdayAdapter } from './adapters/workday';
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
    case 'greenhouse':
      return new GreenhouseAdapter();
    case 'lever':
      return new LeverAdapter();
    case 'workday':
      return new WorkdayAdapter();
    default:
      return null;
  }
}

export function detectPortal(): PortalType {
  const host = window.location.hostname;
  const path = window.location.pathname;

  if (host.includes('linkedin.com')) return 'linkedin';
  if (host.includes('naukri.com')) return 'naukri';
  if (host.includes('indeed.com')) return 'indeed';
  if (host.includes('wellfound.com')) return 'wellfound';
  
  // ATS Detection
  if (host.includes('greenhouse.io') || path.includes('gh/jobs')) return 'greenhouse';
  if (host.includes('lever.co')) return 'lever';
  if (host.includes('myworkdayjobs.com')) return 'workday';
  
  return 'unknown';
}
