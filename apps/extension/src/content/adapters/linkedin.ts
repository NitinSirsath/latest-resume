import { BaseAdapter } from './base';

export class LinkedInAdapter implements BaseAdapter {
  getJobTitle(): string {
    return document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim() || 
           document.querySelector('h1')?.textContent?.trim() || 
           '';
  }

  getCompany(): string {
    return document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent?.trim() || 
           document.querySelector('.jobs-unified-top-card__company-name')?.textContent?.trim() ||
           '';
  }

  getDescription(): string {
    return document.querySelector('.job-details__description')?.textContent?.trim() || 
           document.querySelector('#job-details')?.textContent?.trim() ||
           '';
  }

  getRequirements(): string[] {
    // Basic implementation: find lists in the description
    const description = document.querySelector('.job-details__description') || document.querySelector('#job-details');
    if (!description) return [];
    
    const items = Array.from(description.querySelectorAll('li')).map(li => li.textContent?.trim() || '').filter(Boolean);
    return items;
  }
}
