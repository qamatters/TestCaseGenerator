import { useEffect, useMemo, useState } from 'react';
import { api } from './services/api';

type TestCase = { id: string; selected: boolean; testName: string; objective: string; preCondition: string; steps: string; testData: string; expectedResult: string; priority: string };
type Option = { key: string; name: string };

export default function App() {
  const [jiraStoryId, setJiraStoryId] = useState('QA-101');
  const [project, setProject] = useState('');
  const [folder, setFolder] = useState('');
  const [projects, setProjects] = useState<Option[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [promptType, setPromptType] = useState<'default' | 'advanced' | 'custom'>('default');
  const [customPrompt, setCustomPrompt] = useState('');
  const [testCount, setTestCount] = useState(5);
  const [types, setTypes] = useState<string[]>(['Functional']);
  const [jiraDetails, setJiraDetails] = useState('');
  const [additional, setAdditional] = useState('');
  const [provider, setProvider] = useState('chatgpt');
  const [model, setModel] = useState('gpt-4.1');
  const [refinerProvider, setRefinerProvider] = useState('none');
  const [refinerModel, setRefinerModel] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [message, setMessage] = useState('Ready. Try QA-101, PROJ-1, SEC-12');

  const models = useMemo(() => ({ chatgpt: ['gpt-4.1', 'gpt-4o'], gemini: ['gemini-2.5-pro', 'gemini-2.5-flash'] }), []);

  useEffect(() => { api.projects().then(setProjects); }, []);
  useEffect(() => { if (project) api.folders(project).then(setFolders); }, [project]);

  const onGenerate = async () => {
    const data = await api.generate({ jiraStoryId, jiraDetails, additional, promptType, customPrompt, testCount, types, provider, model, refinerProvider, refinerModel });
    setTestCases(data.map((x: any) => ({ ...x, id: crypto.randomUUID(), selected: false })));
    setMessage(`Generated ${data.length} test cases`);
  };

  return <div className='page'>
    <header><h1>QA Test Case Generator</h1><p>Working demo with mocked Jira + AI + publish APIs</p></header>
    <section className='card grid'>
      <input placeholder='Jira Story ID (QA-101)' value={jiraStoryId} onChange={e => setJiraStoryId(e.target.value)} />
      <button onClick={async () => setJiraDetails(await api.fetchJira(jiraStoryId))}>Fetch Jira details</button>
      <select value={project} onChange={e => setProject(e.target.value)}><option value=''>Project Name</option>{projects.map(p => <option key={p.key} value={p.key}>{p.key} - {p.name}</option>)}</select>
      <select value={folder} onChange={e => setFolder(e.target.value)}><option value=''>Folder</option>{folders.map(f => <option key={f}>{f}</option>)}</select>
      <select value={provider} onChange={e => { setProvider(e.target.value); setModel(models[e.target.value as 'chatgpt' | 'gemini'][0]); }}><option value='chatgpt'>ChatGPT</option><option value='gemini'>Gemini</option></select>
      <select value={model} onChange={e => setModel(e.target.value)}>{models[provider as 'chatgpt'|'gemini'].map(m => <option key={m}>{m}</option>)}</select>
      <select value={refinerProvider} onChange={e => setRefinerProvider(e.target.value)}><option value='none'>No refiner</option><option value='chatgpt'>ChatGPT</option><option value='gemini'>Gemini</option></select>
      <input placeholder='Refiner model' value={refinerModel} onChange={e => setRefinerModel(e.target.value)} />
    </section>
    <section className='card'>
      <div className='radios'>{['default','advanced','custom'].map(p => <label key={p}><input type='radio' checked={promptType===p} onChange={() => setPromptType(p as any)} />{p}</label>)}</div>
      {promptType === 'custom' && <textarea placeholder='Custom prompt (return JSON array with Zephyr fields)' value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} />}
      <div className='types'>{['Functional','Non-Functional','Security','Performance'].map(t => <label key={t}><input type='checkbox' checked={types.includes(t)} onChange={() => setTypes(prev => prev.includes(t)? prev.filter(x=>x!==t): [...prev,t])} />{t}</label>)}</div>
      <div className='split'>
        <textarea placeholder='Jira details (editable)' value={jiraDetails} onChange={e => setJiraDetails(e.target.value)} />
        <textarea placeholder='Additional details and test data' value={additional} onChange={e => setAdditional(e.target.value)} />
      </div>
      <div className='toolbar'>
        <button onClick={async () => setMessage(await api.review(jiraDetails))}>Get AI review</button>
        <button onClick={onGenerate}>Generate test cases</button>
        <button onClick={() => window.open('', '_blank')?.document.write(`<h2>Generated Test Cases</h2><pre>${JSON.stringify(testCases, null, 2)}</pre>`)}>HTMLPreview</button>
        <button onClick={() => {setJiraStoryId('QA-101');setJiraDetails('');setAdditional('');setTestCases([]);setMessage('Cleared all fields');}}>Clear all</button>
        <button onClick={() => { setTestCases([]); setMessage('Test cases reset'); }}>Reset Test Cases</button>
        <button onClick={() => setMessage('Help: Fetch story → choose project/folder → select prompt/model → Generate → Edit → Publish.')}>Help</button>
        <label>No of test cases <input type='number' min={1} max={100} value={testCount} onChange={e => setTestCount(Number(e.target.value)||1)} /></label>
      </div>
    </section>
    <p className='message'>{message}</p>
    <section className='card'>
      <table><thead><tr><th>Select</th><th>TestName</th><th>Objective</th><th>Pre-Condition</th><th>Steps</th><th>TestData</th><th>expectedResult</th><th>Priority</th></tr></thead>
        <tbody>{testCases.map((tc, i) => <tr key={tc.id}>{(['selected','testName','objective','preCondition','steps','testData','expectedResult','priority'] as const).map(k => <td key={k}>{k==='selected'? <input type='checkbox' checked={tc.selected} onChange={e=>setTestCases(p=>p.map((x,idx)=>idx===i?{...x,selected:e.target.checked}:x))} />:<input value={tc[k]} onChange={e=>setTestCases(p=>p.map((x,idx)=>idx===i?{...x,[k]:e.target.value}:x))} />}</td>)}</tr>)}</tbody></table>
      <div className='actions'>
        <button onClick={async () => setMessage((await api.publishSelected(testCases.filter(t=>t.selected))).message)}>Publish selected</button>
        <button onClick={async () => setMessage((await api.publishBulk(testCases)).message)}>Bulk publish to story</button>
      </div>
    </section>
  </div>;
}
