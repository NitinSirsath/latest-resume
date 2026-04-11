import { BaseAdapter } from './base';

export class NaukriAdapter implements BaseAdapter {
  getJobTitle(): string {
    return document.querySelector('.jd-header-title')?.textContent?.trim() || '';
  }

  getCompany(): string {
    return document.querySelector('.jd-header-comp-name')?.textContent?.trim() || '';
  }

  getDescription(): string {
    return document.querySelector('.job-desc')?.textContent?.trim() || '';
  }

  getRequirements(): string[] {
    const container = document.querySelector('.job-desc');
    if (!container) return [];
    return Array.from(container.querySelectorAll('li')).map(li => li.textContent?.trim() || '').filter(Boolean);
  }
}
