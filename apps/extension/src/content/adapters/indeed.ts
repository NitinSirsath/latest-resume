import { BaseAdapter } from './base';

export class IndeedAdapter implements BaseAdapter {
  getJobTitle(): string {
    return document.querySelector('.jobsearch-JobInfoHeader-title')?.textContent?.trim() || '';
  }

  getCompany(): string {
    return document.querySelector('[data-company-name="true"]')?.textContent?.trim() || '';
  }

  getDescription(): string {
    return document.querySelector('#jobDescriptionText')?.textContent?.trim() || '';
  }

  getRequirements(): string[] {
    const container = document.querySelector('#jobDescriptionText');
    if (!container) return [];
    return Array.from(container.querySelectorAll('li')).map(li => li.textContent?.trim() || '').filter(Boolean);
  }
}
