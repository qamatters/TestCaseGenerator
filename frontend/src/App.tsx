import React, { useEffect, useMemo, useState } from 'react';
import { api } from './services/api';

type TestCase = {
  id: string;
  selected: boolean;
  testName: string;
  objective: string;
  preCondition: string;
  steps: string;
  testData: string;
  expectedResult: string;
  priority: string
};

type Option = { key: string; name: string };

export default function App() {
  // Destination & Config States
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

  // Result States
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [refinedCases, setRefinedCases] = useState<TestCase[]>([]);
  const [message, setMessage] = useState('Ready. Fetch QA-101 and generate.');

  // UI Enhancement States
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tempEdit, setTempEdit] = useState<TestCase | null>(null);
  const [saveFlashId, setSaveFlashId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);

  const models = useMemo(() => ({
    chatgpt: ['gpt-4.1', 'gpt-4o'],
    gemini: ['gemini-2.5-pro', 'gemini-2.5-flash']
  }), []);

  const activeCases = refinedCases.length ? refinedCases : testCases;

  // Feedback Helper
  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { api.projects().then(setProjects); }, []);
  useEffect(() => {
    if (project) api.folders(project).then((f) => { setFolders(f); setFolder(f[0] ?? ''); });
  }, [project]);

  // Logic Handlers
  const fetchStory = async () => {
    const story = await api.fetchJira(jiraStoryId);
    setJiraDetails(`Title: ${story.title}\nObjective: ${story.objective}\nDescription: ${story.description}\n\nAC:\n- ${story.acceptanceCriteria.join('\n- ')}`);
    showToast("Jira Details Fetched");
  };

  const onGenerate = async () => {
    const data = await api.generate({ jiraStoryId, jiraDetails, additional, promptType, customPrompt, testCount, types, provider, model });
    const formatted = data.testCases.map((x: any) => ({ ...x, id: crypto.randomUUID(), selected: false }));
    setTestCases(formatted);
    showToast(`Generated ${formatted.length} Test Cases`);
  };

  const handleUpdate = (id: string, field: keyof TestCase, value: any) => {
    const setter = refinedCases.length ? setRefinedCases : setTestCases;
    setter(prev => prev.map(tc => tc.id === id ? { ...tc, [field]: value } : tc));
  };

  const toggleSelectAll = (checked: boolean) => {
    const setter = refinedCases.length ? setRefinedCases : setTestCases;
    setter(prev => prev.map(tc => ({ ...tc, selected: checked })));
    showToast(checked ? "All items selected" : "Selection cleared", 'info');
  };

  const saveInlineEdit = () => {
    if (!tempEdit) return;
    const setter = refinedCases.length ? setRefinedCases : setTestCases;
    setter(prev => prev.map(tc => tc.id === tempEdit.id ? tempEdit : tc));

    setSaveFlashId(tempEdit.id);
    showToast(`Saved Changes for ${tempEdit.testName}`);

    setTimeout(() => {
      setSaveFlashId(null);
      setExpandedId(null);
    }, 600);
  };

  return (
    <div className='page'>
      {/* Toast Notification System */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? '✓' : 'ℹ'} {toast.msg}
        </div>
      )}

      <header>
        <h1>QA Test Case Generator</h1>
        <p style={{color: 'var(--text-muted)'}}>Precision Engineering for Test Automation</p>
      </header>

      {/* STEP 1: DESTINATION */}
      <section className='card'>
        <span className='section-label'>Step 1: Destination</span>
        <div className='step-grid'>
          <div className='input-group'>
            <label>Jira Story ID</label>
            <div style={{display: 'flex', gap: '8px'}}>
               <input value={jiraStoryId} onChange={e => setJiraStoryId(e.target.value)} />
               <button onClick={fetchStory}>Fetch</button>
            </div>
          </div>
          <div className='input-group'>
            <label>Project</label>
            <select value={project} onChange={e => setProject(e.target.value)}>
              {projects.map(p => <option key={p.key} value={p.key}>{p.key}</option>)}
            </select>
          </div>
          <div className='input-group'>
            <label>Folder</label>
            <select value={folder} onChange={e => setFolder(e.target.value)}>
              {folders.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* STEP 2: CONFIGURATION */}
      <section className='card'>
        <span className='section-label'>Step 2: AI Configuration</span>
        <div className='config-bar'>
          <div className='radio-group'>
            {['default', 'advanced', 'custom'].map(p => (
              <label key={p}><input type='radio' checked={promptType === p} onChange={() => setPromptType(p as any)} />{p}</label>
            ))}
          </div>
          <div className='check-group'>
            {['Functional', 'Non-Functional', 'Security', 'Performance'].map(t => (
              <label key={t}><input type='checkbox' checked={types.includes(t)} onChange={() => setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} />{t}</label>
            ))}
          </div>
          <div className='count-group'>
            <label>Count:</label>
            <input type='number' value={testCount} onChange={e => setTestCount(Number(e.target.value))} />
          </div>
        </div>

        {/* Custom Prompt Feature */}
        {promptType === 'custom' && (
          <textarea
            placeholder='Enter custom instructions for the AI...'
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            className='custom-prompt'
          />
        )}

        <div className='step-grid'>
          <div className='input-group'><label>Provider</label><select value={provider} onChange={e => setProvider(e.target.value)}><option value='chatgpt'>ChatGPT</option><option value='gemini'>Gemini</option></select></div>
          <div className='input-group'><label>Model</label><select value={model} onChange={e => setModel(e.target.value)}>{models[provider as 'chatgpt'|'gemini'].map(m => <option key={m}>{m}</option>)}</select></div>
        </div>

        <div className='split' style={{marginTop: '20px'}}>
          <textarea placeholder='Jira Details' value={jiraDetails} onChange={e => setJiraDetails(e.target.value)} />
          <textarea placeholder='Additional Context' value={additional} onChange={e => setAdditional(e.target.value)} />
        </div>

        <div className='toolbar'>
          <button onClick={onGenerate}>Generate Test Cases</button>
          <button className='secondary' onClick={async () => {
             const res = await api.review(jiraDetails);
             showToast("AI Review Complete", 'info');
             setMessage(res);
          }}>Get AI Review</button>
        </div>
      </section>

      <p className='message'>{message}</p>

      {/* STEP 3: EDITOR & PUBLISH */}
      {activeCases.length > 0 && (
        <section className='card'>
          <span className='section-label'>Step 3: Review & Publish</span>
          <div className='table-container'>
            <table className='modern-table'>
              <thead>
                <tr>
                  <th style={{width: '40px'}}><input type='checkbox' onChange={e => toggleSelectAll(e.target.checked)} /></th>
                  <th>Name</th>
                  <th>Pre-Condition</th>
                  <th>Steps</th>
                  <th>Expected</th>
                  <th style={{width: '100px'}}>Priority</th>
                  <th style={{width: '80px'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeCases.map((tc) => (
                  <React.Fragment key={tc.id}>
                    <tr className={`${expandedId === tc.id ? 'active-row' : ''} ${saveFlashId === tc.id ? 'save-flash' : ''}`}>
                      <td><input type='checkbox' checked={tc.selected} onChange={e => handleUpdate(tc.id, 'selected', e.target.checked)} /></td>
                      <td><input value={tc.testName} onChange={e => handleUpdate(tc.id, 'testName', e.target.value)} className='table-input' /></td>
                      <td><input value={tc.preCondition} onChange={e => handleUpdate(tc.id, 'preCondition', e.target.value)} className='table-input' /></td>
                      <td><textarea value={tc.steps} onChange={e => handleUpdate(tc.id, 'steps', e.target.value)} className='table-input-area' /></td>
                      <td><input value={tc.expectedResult} onChange={e => handleUpdate(tc.id, 'expectedResult', e.target.value)} className='table-input' /></td>
                      <td><span className={`priority-badge ${tc.priority.toLowerCase()}`}>{tc.priority}</span></td>
                      <td>
                        <button className='secondary' onClick={() => { setExpandedId(expandedId === tc.id ? null : tc.id); setTempEdit(tc); }}>
                          {expandedId === tc.id ? 'Close' : 'Edit'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === tc.id && tempEdit && (
                      <tr>
                        <td colSpan={7} className='editor-panel'>
                          <div className='inline-editor-grid'>
                            <div className='input-group'><label>Pre-Condition</label><textarea value={tempEdit.preCondition} onChange={e => setTempEdit({...tempEdit, preCondition: e.target.value})} /></div>
                            <div className='input-group'><label>Test Steps</label><textarea style={{minHeight: '120px'}} value={tempEdit.steps} onChange={e => setTempEdit({...tempEdit, steps: e.target.value})} /></div>
                            <div className='input-group' style={{gridColumn: 'span 2'}}><label>Expected Result</label><textarea style={{minHeight: '80px'}} value={tempEdit.expectedResult} onChange={e => setTempEdit({...tempEdit, expectedResult: e.target.value})} /></div>
                            <div style={{gridColumn: 'span 2', display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                                <button className='secondary' onClick={() => setExpandedId(null)}>Cancel</button>
                                <button onClick={saveInlineEdit}>Save Changes</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className='toolbar'>
            <button onClick={async () => {
              const selected = activeCases.filter(t => t.selected);
              if (!selected.length) return showToast('No cases selected', 'info');
              const res = await api.publishSelected({ project, folder, jiraStoryId, testCases: selected });
              showToast("Selected Cases Published!");
            }}>Publish Selected</button>

            <button className='secondary' onClick={async () => {
              const res = await api.publishBulk({ testCases: activeCases });
              showToast("Bulk Publish Successful!");
            }}>Bulk Publish All</button>

            <button className='secondary' style={{color: '#ef4444', marginLeft: 'auto'}} onClick={() => {
                setTestCases([]);
                setRefinedCases([]);
                showToast("Workspace Cleared", 'info');
            }}>Clear All</button>
          </div>
        </section>
      )}
    </div>
  );
}