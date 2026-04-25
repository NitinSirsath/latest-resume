import { BaseAdapter } from './base';

export class LinkedInAdapter implements BaseAdapter {
  getJobTitle(): string {
    const selectors = [
      '.job-details-jobs-unified-top-card__job-title h1',
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__title',
      '.topcard__title',
      'h1.t-24',
      'h1',
      'h2.job-details-jobs-unified-top-card__job-title',
      '.t-24.t-bold'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text) return text;
    }
    
    // Simpler fallback: parse document.title
    // e.g. "Software Engineer at Google | LinkedIn"
    const docTitle = document.title;
    if (docTitle && docTitle.includes(' | ')) {
       return docTitle.split(' | ')[0].trim();
    }
    
    return 'Unknown Job Title';
  }

  getCompany(): string {
    const selectors = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '.topcard__org-name-link',
      '.topcard__flavor a',
      '[data-test-job-card-company-name]',
      '.job-details-jobs-unified-top-card__primary-description a'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text) return text;
    }
    
    // Fallback: Try to get from document.title
    const docTitle = document.title;
    if (docTitle && docTitle.includes(' at ')) {
       const parts = docTitle.split(' at ');
       return parts[1]?.split(' | ')[0]?.trim() || 'Unknown Company';
    }
    
    return 'Unknown Company';
  }

  getDescription(): string {
    const selectors = [
      '.jobs-description__content .jobs-description-content__text',
      '.jobs-description__content',
      '#job-details',
      '.job-details__description',
      '.jobs-box__html-content',
      '.description__text',
      '.jobs-description',
      'main article',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text && text.length > 100) {
        return text;
      }
    }
    
    // Simplest fallback: grab the main content but avoid the footer/nav
    const main = document.querySelector('main') || document.body;
    // Clone to avoid modifying the actual page
    const clone = main.cloneNode(true) as HTMLElement;
    // Remove known noisy elements from the clone
    clone.querySelectorAll('footer, nav, header, .global-nav, .global-footer, #global-nav, #global-footer').forEach(el => el.remove());
    
    const text = clone.innerText?.trim();
    if (text && text.length > 100) {
        return text.substring(0, 5000); 
    }

    return '';
  }

  getRequirements(): string[] {
    const descSelectors = [
      '.jobs-description__content',
      '#job-details',
      '.job-details__description',
      '.jobs-box__html-content',
    ];
    for (const sel of descSelectors) {
      const description = document.querySelector(sel);
      if (description) {
        const items = Array.from(description.querySelectorAll('li'))
          .map(li => li.textContent?.trim() || '')
          .filter(t => t.length > 5);
        if (items.length > 0) return items;
      }
    }
    return [];
  }
}
