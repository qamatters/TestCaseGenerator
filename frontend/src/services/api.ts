import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 6000,
});

const mockProjects = [
  { key: 'QAT', name: 'QA Transformation' },
  { key: 'PROJ', name: 'Customer Portal' },
  { key: 'SEC', name: 'Security Hardening' },
];

const mockFolders: Record<string, string[]> = {
  QAT: ['Regression/UI', 'Regression/API', 'Smoke/Web'],
  PROJ: ['Sprint-24/Auth', 'Sprint-24/Profile', 'Release-3/Checkout'],
  SEC: ['OWASP/Injection', 'OWASP/Auth', 'Performance/Load'],
};

type PublishPayload = {
  project: string;
  folder: string;
  jiraStoryId: string;
  testCases: any[];
};

export const api = {
  async fetchJira(jiraStoryId: string) {
    try {
      return (await client.get(`/jira/${jiraStoryId}`)).data;
    } catch {
      return {
        storyId: jiraStoryId,
        title: 'Add item to cart',
        objective: 'Allow users to add in-stock items to cart with correct quantity and price.',
        description: 'As a shopper, I want to add items from PDP/PLP to cart for checkout.',
        acceptanceCriteria: [
          'Add from PDP and PLP should work',
          'Cart badge updates immediately',
          'Out-of-stock items are blocked',
          'Quantity updates recalculate totals',
        ],
        comments: [
          'PO: include guest + logged-in flow',
          'Dev: inventory API may be delayed up to 2s',
          'QA: validate max quantity rules',
        ],
      };
    }
  },

  async projects() {
    try {
      return (await client.get('/projects')).data.projects;
    } catch {
      return mockProjects;
    }
  },

  async folders(projectKey: string) {
    try {
      return (await client.get(`/projects/${projectKey}/folders`)).data.folders;
    } catch {
      return mockFolders[projectKey] ?? ['General'];
    }
  },

  async review(jiraDetails: string) {
    try {
      return (await client.post('/ai/review', { jiraDetails })).data.review;
    } catch {
      return `Summary:
Story is generally good for QA planning.

Strengths:
- Clear user intent
- Core flow is understandable

Gaps:
- Missing boundary values
- Missing API failure criteria

Suggestions:
- Add explicit negative scenarios
- Add latency/timeout acceptance criteria

Score: 7.5`;
    }
  },

  async generate(payload: any) {
    try {
      return (await client.post('/ai/generate', payload)).data;
    } catch {
      const count = payload.testCount ?? 5;
      const types = payload.types?.length ? payload.types : ['Functional'];
      const base = Array.from({ length: count }).map((_, i) => ({
        testName: `${types[i % types.length]} | Add item to cart | Scenario ${i + 1}`,
        objective: `Validate ${types[i % types.length]} scenario`,
        preCondition: 'User is on product page and stock is available',
        steps: `1. Open PDP\n2. Set quantity ${i + 1}\n3. Click Add to cart\n4. Verify cart`,
        testData: `{"sku":"SKU-${String(i + 1).padStart(3, '0')}","qty":${i + 1}}`,
        expectedResult: 'Item is added and cart badge updates',
        priority: (i + 1) % 3 === 0 ? 'High' : 'Medium',
      }));

      return { testCases: base };
    }
  },

  async refineWithCritic(payload: any) {
    // pure mock demo pass
    const refined = (payload.testCases || []).map((t: any) => ({
      ...t,
      testName: `${t.testName} [Critic Refined]`,
      expectedResult: `${t.expectedResult}; includes edge-case validation`,
      priority: t.priority === 'Medium' ? 'High' : t.priority,
    }));
    return { testCases: refined };
  },

  async publishSelected(payload: PublishPayload) {
    try {
      return (await client.post('/publish/selected', payload)).data;
    } catch {
      const links = payload.testCases.map((_: any, idx: number) => {
        const id = `TC-${Math.floor(1000 + Math.random() * 9000)}-${idx + 1}`;
        return {
          id,
          url: `https://mock-zephyr.local/${payload.project}/${payload.folder}/${id}`,
        };
      });

      return {
        message: `${links.length} test case(s) published`,
        published: links,
      };
    }
  },

  async publishBulk(payload: { testCases: any[] }) {
    try {
      return (await client.post('/publish/bulk', payload)).data;
    } catch {
      const links = (payload.testCases || []).map((_: any, idx: number) => {
        const id = `TC-${Math.floor(1000 + Math.random() * 9000)}-${idx + 1}`;
        return { id, url: `https://mock-zephyr.local/bulk/${id}` };
      });
      return {
        message: `${links.length} test case(s) published in bulk`,
        published: links,
      };
    }
  },

  async addJiraComment(payload: { jiraStoryId: string; comment: string }) {
    try {
      return (await client.post('/jira/comment', payload)).data;
    } catch {
      return { message: `Comment posted to ${payload.jiraStoryId} (mock)` };
    }
  },

  async linkToJira(payload: { jiraStoryId: string; testCaseIds: string[] }) {
    try {
      return (await client.post('/jira/link', payload)).data;
    } catch {
      return { message: `Linked ${payload.testCaseIds.length} cases to ${payload.jiraStoryId} (mock)` };
    }
  },
};