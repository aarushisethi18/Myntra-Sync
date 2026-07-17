export interface ContextResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };

  weather: {
    city: string;
    temperature: number;
    condition: string;
  };

  upcomingEvents: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
  }[];

  wardrobe: unknown[];

  recommendations: {
    id: string;
    title: string;
    reason: string;
    confidence: number;
  }[];

  notifications: unknown[];
}