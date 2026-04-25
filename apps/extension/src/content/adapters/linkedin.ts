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
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text) {
        console.log(`[ResumeTailor] Job title found via "${sel}":`, text);
        return text;
      }
    }
    console.warn('[ResumeTailor] Could not find job title on this LinkedIn page');
    return '';
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
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text) return text;
    }
    return '';
  }

  getDescription(): string {
    const selectors = [
      '.jobs-description__content .jobs-description-content__text',
      '.jobs-description__content',
      '#job-details',
      '.job-details__description',
      '.jobs-box__html-content',
      '.description__text',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text && text.length > 50) {
        console.log(`[ResumeTailor] Description found via "${sel}", length: ${text.length}`);
        return text;
      }
    }
    console.warn('[ResumeTailor] Could not find job description on this LinkedIn page');
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
