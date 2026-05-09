import { BaseAdapter } from './base';

export class LeverAdapter implements BaseAdapter {
  getJobTitle(): string {
    return document.querySelector('.posting-header h2')?.textContent?.trim() || '';
  }

  getCompany(): string {
    // Lever usually doesn't show company in a consistent class, often in title
    return document.title.split('-')[0]?.trim() || '';
  }

  getDescription(): string {
    return document.querySelector('.section-wrapper .posting-sections')?.textContent?.trim() || '';
  }

  getRequirements(): string[] {
    return [];
  }
}
