export interface BaseAdapter {
  getJobTitle(): string;
  getCompany(): string;
  getDescription(): string;
  getRequirements(): string[];
  
  // For Search Page Overlays
  getJobCards?(): HTMLElement[];
  getCardData?(card: HTMLElement): { title: string; company: string };
  injectScore?(card: HTMLElement, score: number): void;
}
