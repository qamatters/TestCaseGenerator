import axios from 'axios';

const client = axios.create({ baseURL: 'http://localhost:8080/api' });

export const api = {
  fetchJira: async (jiraStoryId: string) => (await client.get(`/jira/${jiraStoryId}`)).data.details,
  review: async (jiraDetails: string) => (await client.post('/ai/review', { jiraDetails })).data.review,
  generate: async (payload: any) => (await client.post('/ai/generate', payload)).data.testCases
};
