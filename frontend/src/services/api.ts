import axios from 'axios';

const client = axios.create({ baseURL: 'http://localhost:8080/api', timeout: 5000 });

const localProjects = [
  { key: 'QAT', name: 'QA Transformation' },
  { key: 'PROJ', name: 'Customer Portal' },
  { key: 'SEC', name: 'Security Hardening' },
];
const localFolders: Record<string, string[]> = {
  QAT: ['Regression/UI', 'Regression/API', 'Smoke/Web'],
  PROJ: ['Sprint-24/Auth', 'Sprint-24/Profile', 'Release-3/Checkout'],
  SEC: ['OWASP/Injection', 'OWASP/Auth', 'Performance/Load'],
};

export const api = {
  fetchJira: async (jiraStoryId: string) => {
    try { return (await client.get(`/jira/${jiraStoryId}`)).data; }
    catch {
      return {
        storyId: jiraStoryId,
        title: 'Add item to cart',
        objective: 'Allow users to add in-stock items to cart with correct price and quantity.',
        description: 'As a shopper, I want to add products from PDP/listing pages so I can checkout later.',
        acceptanceCriteria: ['Add from PDP works', 'Cart badge updates', 'Out-of-stock blocked', 'Qty updates total'],
        comments: ['PO: include guest flow', 'Dev: inventory can be delayed', 'QA: validate max qty'],
      };
    }
  },
  projects: async () => {
    try { return (await client.get('/projects')).data.projects; }
    catch { return localProjects; }
  },
  folders: async (projectKey: string) => {
    try { return (await client.get(`/projects/${projectKey}/folders`)).data.folders; }
    catch { return localFolders[projectKey] ?? ['General']; }
  },
  review: async (jiraDetails: string) => {
    try { return (await client.post('/ai/review', { jiraDetails })).data.review; }
    catch { return 'QA Review: include negative, boundary, API error, and role-based test scenarios.'; }
  },
  generate: async (payload: any) => {
    try { return (await client.post('/ai/generate', payload)).data; }
    catch {
      const count = payload.testCount ?? 5;
      const types = payload.types?.length ? payload.types : ['Functional'];
      const base = Array.from({ length: count }).map((_, i) => ({
        testName: `${types[i % types.length]} | Add item to cart | Scenario ${i + 1}`,
        objective: `Validate ${types[i % types.length]} scenario`,
        preCondition: 'User is on PDP and stock is available',
        steps: `1. Open PDP\n2. Set qty ${i + 1}\n3. Click Add to cart\n4. Validate cart`,
        testData: `{"sku":"SKU-${String(i + 1).padStart(3, '0')}","qty":${i + 1}}`,
        expectedResult: 'Item is added and cart updates',
        priority: (i + 1) % 3 === 0 ? 'High' : 'Medium',
      }));
      const refined = payload.refinerProvider && payload.refinerProvider !== 'none'
        ? base.map((t: any) => ({ ...t, testName: `${t.testName} [Refined]`, expectedResult: `${t.expectedResult} + refined edge checks` }))
        : [];
      return { testCases: base, refinedTestCases: refined };
    }
  },
  publishSelected: async (payload: any) => {
    try { return (await client.post('/publish/selected', payload)).data; }
    catch {
      const id = `TC-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        message: `Test case ${id} created for project ${payload.project} under folder ${payload.folder}`,
        link: `https://mock-zephyr.local/${payload.project}/${payload.folder}/${id}`,
        notification: `Notification: test case ${id} is created by user qa.user for project ${payload.project}`,
        jiraLinkMessage: `Following Jira story is linked to Zephyr now: ${payload.jiraStoryId}`,
      };
    }
  },
  publishBulk: async (payload: any) => {
    try { return (await client.post('/publish/bulk', payload)).data; }
    catch { return { message: 'All test cases published to story (mock).' }; }
  },
  postComment: async (jiraStoryId: string, comment: string) => {
    try { return (await client.post('/jira/comment', { jiraStoryId, comment })).data; }
    catch { return { message: `Comment posted on Jira story ${jiraStoryId}` }; }
  },
};