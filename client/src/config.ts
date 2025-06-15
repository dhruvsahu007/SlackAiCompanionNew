export const API_BASE_URL = 'http://localhost:5000';

export const API_ENDPOINTS = {
  USER: '/api/user',
  LOGIN: '/api/login',
  LOGOUT: '/api/logout',
  REGISTER: '/api/register',
  CHANNELS: '/api/channels',
  MESSAGES: '/api/messages',
  DIRECT_MESSAGES: '/api/direct-messages',
  DIRECT_MESSAGE_USERS: '/api/direct-message-users',
  SEARCH: '/api/search',
  AI_SUGGESTIONS: '/api/ai/suggest-reply',
  AI_TONE_ANALYSIS: '/api/ai/analyze-tone',
  AI_MEETING_NOTES: '/api/ai/generate-notes',
} as const; 