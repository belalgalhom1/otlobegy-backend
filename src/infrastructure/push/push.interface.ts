export interface PushJob {
  action: string;
  tokens?: string[];
  topic?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
}
