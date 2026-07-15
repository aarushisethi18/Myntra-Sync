// User

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Weather

export interface Weather {
  city: string;
  temperature: number;
  condition: string;
  icon?: string;
}

// Calendar

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
}

// Wardrobe

export interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  color: string;
  brand?: string;
  imageUrl?: string;
}

// Recommendation

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  confidence: number;
  products?: string[];
}

// Notification

export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
}

// Context

export interface ContextSnapshot {
  user: User;
  weather: Weather;
  upcomingEvents: CalendarEvent[];
  wardrobe: WardrobeItem[];
  recommendations: Recommendation[];
  notifications: Notification[];
}