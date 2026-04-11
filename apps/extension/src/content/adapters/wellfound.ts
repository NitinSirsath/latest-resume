import { BaseAdapter } from './base';

export class WellfoundAdapter implements BaseAdapter {
  getJobTitle(): string {
    return document.querySelector('.job-description h1')?.textContent?.trim() || '';
  }

  getCompany(): string {
    return document.querySelector('.job-description h2')?.textContent?.trim() || '';
  }

  getDescription(): string {
    return document.querySelector('.job-description')?.textContent?.trim() || '';
  }

  getRequirements(): string[] {
    const container = document.querySelector('.job-description');
    if (!container) return [];
    return Array.from(container.querySelectorAll('li')).map(li => li.textContent?.trim() || '').filter(Boolean);
  }
}
