import { BaseAdapter } from './base';

export class WorkdayAdapter implements BaseAdapter {
  getJobTitle(): string {
    return document.querySelector('[data-automation-id="jobPostingHeader"]')?.textContent?.trim() || '';
  }

  getCompany(): string {
    return ''; // Often hidden or in logo alt text
  }

  getDescription(): string {
    return document.querySelector('[data-automation-id="jobPostingDescription"]')?.textContent?.trim() || '';
  }

  getRequirements(): string[] {
    return [];
  }
}
