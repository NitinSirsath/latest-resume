import { BaseAdapter } from './base';

export class GreenhouseAdapter implements BaseAdapter {
  getJobTitle(): string {
    return document.querySelector('.app-title')?.textContent?.trim() || '';
  }

  getCompany(): string {
    return document.querySelector('.company-name')?.textContent?.trim()?.replace(' at ', '') || '';
  }

  getDescription(): string {
    return document.querySelector('#content')?.textContent?.trim() || '';
  }

  getRequirements(): string[] {
    return [];
  }
}
