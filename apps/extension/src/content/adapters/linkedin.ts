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

  getJobCards(): HTMLElement[] {
    return Array.from(document.querySelectorAll('.jobs-search-results__list-item, .job-card-container'));
  }

  getCardData(card: HTMLElement): { title: string; company: string } {
    const title = card.querySelector('.job-card-list__title, .job-card-container__link')?.textContent?.trim() || '';
    const company = card.querySelector('.job-card-container__company-name, .job-card-list__item-subtitle')?.textContent?.trim() || '';
    return { title, company };
  }

  injectScore(card: HTMLElement, score: number): void {
    if (card.querySelector('.rt-match-badge')) return;
    
    const badge = document.createElement('div');
    badge.className = 'rt-match-badge';
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.padding = '2px 6px';
    badge.style.borderRadius = '4px';
    badge.style.fontSize = '10px';
    badge.style.fontWeight = 'bold';
    badge.style.marginLeft = '8px';
    badge.style.backgroundColor = score > 80 ? '#dcfce7' : score > 50 ? '#fef9c3' : '#fee2e2';
    badge.style.color = score > 80 ? '#166534' : score > 50 ? '#854d0e' : '#991b1b';
    badge.style.border = `1px solid ${score > 80 ? '#bbf7d0' : score > 50 ? '#fef08a' : '#fecaca'}`;
    badge.innerHTML = `Match: ${score}%`;
    
    const target = card.querySelector('.job-card-list__title, .job-card-container__link');
    target?.parentElement?.appendChild(badge);
  }
}
