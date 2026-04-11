export interface BaseAdapter {
  getJobTitle(): string;
  getCompany(): string;
  getDescription(): string;
  getRequirements(): string[];
}
