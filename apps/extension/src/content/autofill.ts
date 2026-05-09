import { AutofillData } from '@resumetailor/types';

const FIELD_SELECTORS = {
  firstName: ['input[name*="first_name"]', 'input[id*="first_name"]', 'input[placeholder*="First Name"]'],
  lastName: ['input[name*="last_name"]', 'input[id*="last_name"]', 'input[placeholder*="Last Name"]'],
  email: ['input[name="email"]', 'input[type="email"]', 'input[id*="email"]'],
  phone: ['input[name*="phone"]', 'input[type="tel"]', 'input[id*="phone"]'],
  linkedin: ['input[name*="linkedin"]', 'input[id*="linkedin"]', 'input[placeholder*="LinkedIn"]'],
  github: ['input[name*="github"]', 'input[id*="github"]', 'input[placeholder*="GitHub"]'],
  portfolio: ['input[name*="portfolio"]', 'input[id*="portfolio"]', 'input[name*="website"]', 'input[placeholder*="Website"]'],
};

export function performAutofill(data: AutofillData): boolean {
  let fieldsFilled = 0;

  for (const [key, selectors] of Object.entries(FIELD_SELECTORS)) {
    const value = data[key as keyof AutofillData];
    if (!value) continue;

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLInputElement;
      if (element && !element.value) {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        fieldsFilled++;
        break;
      }
    }
  }

  return fieldsFilled > 0;
}
