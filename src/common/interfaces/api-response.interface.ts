export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  errors: Record<string, string[]> | null;
  timestamp: string;
}
