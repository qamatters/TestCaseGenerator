import axios from 'axios';

const client = axios.create({ baseURL: 'http://localhost:8080/api' });

export const api = {
  fetchJira: async (jiraStoryId: string) => (await client.get(`/jira/${jiraStoryId}`)).data.details,
  projects: async () => (await client.get('/projects')).data.projects,
  folders: async (projectKey: string) => (await client.get(`/projects/${projectKey}/folders`)).data.folders,
  review: async (jiraDetails: string) => (await client.post('/ai/review', { jiraDetails })).data.review,
  generate: async (payload: any) => (await client.post('/ai/generate', payload)).data.testCases,
  publishSelected: async (testCases: any[]) => (await client.post('/publish/selected', { testCases })).data,
  publishBulk: async (testCases: any[]) => (await client.post('/publish/bulk', { testCases })).data,
};
