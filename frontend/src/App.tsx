import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { api } from './services/api';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type TestCase = {
  id: string;
  selected: boolean;
  testName: string;
  objective: string;
  preCondition: string;
  steps: string;
  testData: string;
  expectedResult: string;
  priority: string;
};

type Option = { key: string; name: string };

type AIReview = {
  summary: string;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  score: number;
  rawText: string;
};

type PublishedLink = { id: string; url: string };

type ConfirmPublishState = {
  mode: 'single' | 'bulk';
  cases: TestCase[];
  step: 'confirm' | 'link-jira' | 'done';
  published?: PublishedLink[];
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function parseAIReview(raw: string): AIReview {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const strengths: string[] = [];
  const gaps: string[] = [];
  const suggestions: string[] = [];
  let summary = '';
  let score = 0;
  let section = '';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('summary') || lower.startsWith('overview')) { section = 'summary'; continue; }
    if (lower.startsWith('strength') || lower.startsWith('positive')) { section = 'strengths'; continue; }
    if (lower.startsWith('gap') || lower.startsWith('issue') || lower.startsWith('weakness') || lower.startsWith('missing')) { section = 'gaps'; continue; }
    if (lower.startsWith('suggest') || lower.startsWith('recommend') || lower.startsWith('improvement')) { section = 'suggestions'; continue; }
    if (lower.startsWith('score') || lower.startsWith('rating')) {
      const match = line.match(/(\d+(\.\d+)?)/);
      if (match) score = parseFloat(match[1]);
      continue;
    }

    const bullet = line.replace(/^[-*•]\s*/, '');
    if (section === 'summary') summary += (summary ? ' ' : '') + bullet;
    else if (section === 'strengths') strengths.push(bullet);
    else if (section === 'gaps') gaps.push(bullet);
    else if (section === 'suggestions') suggestions.push(bullet);
    else if (!summary) summary += (summary ? ' ' : '') + bullet;
  }

  if (!summary) summary = raw.slice(0, 280);
  return { summary, strengths, gaps, suggestions, score, rawText: raw };
}

/* ─── Modal Components ───────────────────────────────────────────────────── */
function ConfirmModal({
  state, project, folder, jiraStoryId, onClose, onConfirm, onLinkJira,
}: {
  state: ConfirmPublishState;
  project: string;
  folder: string;
  jiraStoryId: string;
  onClose: () => void;
  onConfirm: () => void;
  onLinkJira: (link: boolean) => void;
}) {
  if (state.step === 'confirm') {
    return (
      <div className="modal-overlay">
        <div className="modal-box">
          <div className="modal-icon">📋</div>
          <h2 className="modal-title">Confirm Publish</h2>
          <p className="modal-body">
            You are about to publish <strong>{state.cases.length}</strong> test case{state.cases.length !== 1 ? 's' : ''} to:
          </p>
          <div className="modal-meta">
            <span className="modal-tag">Project: <b>{project}</b></span>
            <span className="modal-tag">Folder: <b>{folder}</b></span>
          </div>
          <p className="modal-body">Are you sure you want to proceed?</p>
          <div className="modal-actions">
            <button className="secondary" onClick={onClose}>No, Cancel</button>
            <button onClick={onConfirm}>Yes, Publish</button>
          </div>
        </div>
      </div>
    );
  }

  if (state.step === 'link-jira') {
    return (
      <div className="modal-overlay">
        <div className="modal-box">
          <div className="modal-icon success-icon">✅</div>
          <h2 className="modal-title">Test Cases Created!</h2>
          <p className="modal-body">
            <strong>{state.published?.length ?? state.cases.length}</strong> test case{state.cases.length !== 1 ? 's' : ''} published under <b>{folder}</b>.
          </p>

          {!!state.published?.length && (
            <div className="published-links">
              {state.published.map(p => (
                <a key={p.id} href={p.url} target="_blank" rel="noreferrer">{p.id}</a>
              ))}
            </div>
          )}

          <p className="modal-body" style={{ marginTop: 12 }}>
            Link these to Jira story <b style={{ color: 'var(--accent)' }}>{jiraStoryId}</b>?
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => onLinkJira(false)}>No, Skip</button>
            <button onClick={() => onLinkJira(true)}>Yes, Link to Jira</button>
          </div>
        </div>
      </div>
    );
  }

  if (state.step === 'done') {
    return (
      <div className="modal-overlay">
        <div className="modal-box">
          <div className="modal-icon success-icon">🎉</div>
          <h2 className="modal-title">All Done!</h2>
          <p className="modal-body">
            Published test case{state.cases.length !== 1 ? 's have' : ' has'} been linked to <b style={{ color: 'var(--accent)' }}>{jiraStoryId}</b>.
          </p>
          <div className="modal-actions"><button onClick={onClose}>Close</button></div>
        </div>
      </div>
    );
  }

  return null;
}

function AIReviewPanel({
  review, jiraStoryId, onClose, onPublishToJira,
}: {
  review: AIReview;
  jiraStoryId: string;
  onClose: () => void;
  onPublishToJira: () => void;
}) {
  return (
    <div className="review-panel">
      <div className="review-header">
        <div>
          <span className="section-label">AI Review Analysis</span>
          {review.score > 0 && <div className="review-score-pill">Score: <strong>{review.score}/10</strong></div>}
        </div>
        <button className="secondary icon-btn" onClick={onClose}>✕</button>
      </div>

      <div className="review-summary">{review.summary}</div>

      <div className="review-grid">
        {review.strengths.length > 0 && (
          <div className="review-block strengths">
            <div className="review-block-title">✅ Strengths</div>
            <ul>{review.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        )}
        {review.gaps.length > 0 && (
          <div className="review-block gaps">
            <div className="review-block-title">⚠️ Gaps / Issues</div>
            <ul>{review.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
          </div>
        )}
        {review.suggestions.length > 0 && (
          <div className="review-block suggestions" style={{ gridColumn: '1 / -1' }}>
            <div className="review-block-title">💡 Suggestions</div>
            <ul>{review.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        )}
      </div>

      <div className="review-footer">
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Publish this review as Jira comment on <b>{jiraStoryId}</b>?
        </span>
        <button onClick={onPublishToJira}>📌 Publish to Jira</button>
      </div>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────────── */
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

  const [criticEnabled, setCriticEnabled] = useState(false);
  const [criticProvider, setCriticProvider] = useState('gemini');
  const [criticModel, setCriticModel] = useState('gemini-2.5-pro');
  const [criticLoading, setCriticLoading] = useState(false);

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [refinedCases, setRefinedCases] = useState<TestCase[]>([]);

  const [aiReview, setAiReview] = useState<AIReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tempEdit, setTempEdit] = useState<TestCase | null>(null);
  const [saveFlashId, setSaveFlashId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmPublishState | null>(null);
  const [generating, setGenerating] = useState(false);

  const [showPreview, setShowPreview] = useState(false);

  const models = useMemo(() => ({
    chatgpt: ['gpt-4.1', 'gpt-4o'],
    gemini: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  }), []);

  const activeCases = refinedCases.length ? refinedCases : testCases;

  const showToast = useCallback((msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => { api.projects().then(setProjects); }, []);

  useEffect(() => {
    if (project) {
      api.folders(project).then((f: string[]) => {
        setFolders(f);
        setFolder(f[0] ?? '');
      });
    } else {
      setFolders([]);
      setFolder('');
    }
  }, [project]);

  useEffect(() => {
    setModel(models[provider as 'chatgpt' | 'gemini'][0]);
  }, [provider, models]);

  useEffect(() => {
    setCriticModel(models[criticProvider as 'chatgpt' | 'gemini'][0]);
  }, [criticProvider, models]);

  const fetchStory = async () => {
    try {
      const story = await api.fetchJira(jiraStoryId);
      setJiraDetails(`Title: ${story.title}\nObjective: ${story.objective}\nDescription: ${story.description}\n\nAC:\n- ${story.acceptanceCriteria.join('\n- ')}`);
      showToast('Jira Details Fetched');
    } catch {
      showToast('Failed to fetch Jira story', 'error');
    }
  };

  const onGenerate = async () => {
    setGenerating(true);
    try {
      const data = await api.generate({ jiraStoryId, jiraDetails, additional, promptType, customPrompt, testCount, types, provider, model });
      const formatted: TestCase[] = data.testCases.map((x: any) => ({ ...x, id: crypto.randomUUID(), selected: false }));
      setTestCases(formatted);
      setRefinedCases([]);

      if (criticEnabled) {
        setCriticLoading(true);
        try {
          const criticRes = await api.refineWithCritic({
            testCases: formatted,
            jiraDetails,
            criticProvider,
            criticModel,
          });
          const refinedFormatted: TestCase[] = criticRes.testCases.map((x: any) => ({
            ...x,
            id: crypto.randomUUID(),
            selected: false,
          }));
          setRefinedCases(refinedFormatted);
          showToast(`Generated ${formatted.length} → Critic refined ${refinedFormatted.length}`);
        } catch {
          showToast('Critic refinement failed; showing primary output', 'info');
        } finally {
          setCriticLoading(false);
        }
      } else {
        showToast(`Generated ${formatted.length} Test Cases`);
      }
    } catch {
      showToast('Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdate = (id: string, field: keyof TestCase, value: any) => {
    const setter = refinedCases.length ? setRefinedCases : setTestCases;
    setter(prev => prev.map(tc => tc.id === id ? { ...tc, [field]: value } : tc));
  };

  const toggleSelectAll = (checked: boolean) => {
    const setter = refinedCases.length ? setRefinedCases : setTestCases;
    setter(prev => prev.map(tc => ({ ...tc, selected: checked })));
    showToast(checked ? 'All items selected' : 'Selection cleared', 'info');
  };

  const saveInlineEdit = () => {
    if (!tempEdit) return;
    const setter = refinedCases.length ? setRefinedCases : setTestCases;
    setter(prev => prev.map(tc => tc.id === tempEdit.id ? tempEdit : tc));
    setSaveFlashId(tempEdit.id);
    showToast(`Saved: ${tempEdit.testName}`);
    setTimeout(() => { setSaveFlashId(null); setExpandedId(null); }, 700);
  };

  const onGetReview = async () => {
    setReviewLoading(true);
    setAiReview(null);
    try {
      const res = await api.review(jiraDetails);
      const parsed = parseAIReview(typeof res === 'string' ? res : JSON.stringify(res));
      setAiReview(parsed);
      showToast('AI Review Complete', 'info');
    } catch {
      showToast('AI Review failed', 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  const onPublishReviewToJira = async () => {
    if (!aiReview) return;
    try {
      await api.addJiraComment({ jiraStoryId, comment: aiReview.rawText });
      showToast('Review published to Jira!');
    } catch {
      showToast('Failed to publish to Jira', 'error');
    }
  };

  const startPublish = (mode: 'single' | 'bulk') => {
    const cases = mode === 'single' ? activeCases.filter(t => t.selected) : activeCases;
    if (!cases.length) { showToast('No test cases to publish', 'info'); return; }
    setConfirmState({ mode, cases, step: 'confirm' });
  };

  const handleConfirmPublish = async () => {
    if (!confirmState) return;
    try {
      const res = confirmState.mode === 'single'
        ? await api.publishSelected({ project, folder, jiraStoryId, testCases: confirmState.cases })
        : await api.publishBulk({ testCases: confirmState.cases });

      setConfirmState({
        ...confirmState,
        step: 'link-jira',
        published: res?.published ?? [],
      });
    } catch {
      showToast('Publish failed', 'error');
      setConfirmState(null);
    }
  };

  const handleLinkJira = async (link: boolean) => {
    if (!confirmState) return;
    if (!link) {
      showToast('Published without Jira link');
      setConfirmState(null);
      return;
    }
    try {
      const ids = (confirmState.published?.map(p => p.id)) || confirmState.cases.map(c => c.id);
      await api.linkToJira({ jiraStoryId, testCaseIds: ids });
      setConfirmState({ ...confirmState, step: 'done' });
    } catch {
      showToast('Jira link failed', 'error');
      setConfirmState(null);
    }
  };

  const closeConfirm = () => {
    if (confirmState?.step === 'done') showToast('Test cases successfully published & linked!');
    setConfirmState(null);
  };

  return (
    <div className='page'>
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'} {toast.msg}
        </div>
      )}

      {confirmState && (
        <ConfirmModal
          state={confirmState}
          project={project}
          folder={folder}
          jiraStoryId={jiraStoryId}
          onClose={closeConfirm}
          onConfirm={handleConfirmPublish}
          onLinkJira={handleLinkJira}
        />
      )}

      <div className='page-inner'>
        <header>
          <h1>QA Test Case Generator</h1>
          <p style={{ color: 'var(--text-muted)' }}>Precision Engineering for Test Automation</p>
        </header>

        <section className='card'>
          <span className='section-label'>Step 1: Destination</span>
          <div className='step-grid'>
            <div className='input-group'>
              <label>Jira Story ID</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={jiraStoryId} onChange={e => setJiraStoryId(e.target.value)} />
                <button onClick={fetchStory}>Fetch</button>
              </div>
            </div>
            <div className='input-group'>
              <label>Project</label>
              <select value={project} onChange={e => setProject(e.target.value)}>
                <option value=''>— Select Project —</option>
                {projects.map(p => <option key={p.key} value={p.key}>{p.name || p.key}</option>)}
              </select>
            </div>
            <div className='input-group'>
              <label>Folder {project ? '' : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(select a project first)</span>}</label>
              <select value={folder} onChange={e => setFolder(e.target.value)} disabled={!project}>
                {folders.length === 0 && <option value=''>— Auto-populated —</option>}
                {folders.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className='card'>
          <span className='section-label'>Step 2: AI Configuration</span>

          <div className='config-section'>
            <div className='config-col'>
              <div className='config-field-label'>Prompt Type</div>
              <div className='radio-group'>
                {(['default', 'advanced', 'custom'] as const).map(p => (
                  <label key={p} className={`radio-option ${promptType === p ? 'active' : ''}`}>
                    <input type='radio' checked={promptType === p} onChange={() => setPromptType(p)} />
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div className='config-col'>
              <div className='config-field-label'>Test Types</div>
              <div className='check-group'>
                {['Functional', 'Non-Functional', 'Security', 'Performance'].map(t => (
                  <label key={t} className={`check-option ${types.includes(t) ? 'active' : ''}`}>
                    <input
                      type='checkbox'
                      checked={types.includes(t)}
                      onChange={() => setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>

            <div className='config-col config-col-sm'>
              <div className='config-field-label'>Test Count</div>
              <input type='number' value={testCount} min={1} max={50} onChange={e => setTestCount(Number(e.target.value))} className='count-input' />
            </div>
          </div>

          <div className='config-providers-row'>
            <div className='provider-block primary-provider'>
              <div className='provider-block-label'>Primary AI</div>
              <div className='provider-fields'>
                <div className='input-group'>
                  <label>Provider</label>
                  <select value={provider} onChange={e => setProvider(e.target.value)}>
                    <option value='chatgpt'>ChatGPT</option>
                    <option value='gemini'>Gemini</option>
                  </select>
                </div>
                <div className='input-group'>
                  <label>Model</label>
                  <select value={model} onChange={e => setModel(e.target.value)}>
                    {models[provider as 'chatgpt' | 'gemini'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className={`provider-block critic-provider ${criticEnabled ? 'critic-active' : ''}`}>
              <div className='provider-block-label'>
                <label className='critic-toggle-label'>
                  <input type='checkbox' checked={criticEnabled} onChange={e => setCriticEnabled(e.target.checked)} />
                  <span>AI Critic (Second Pass)</span>
                  <span className='critic-badge'>NEW</span>
                </label>
              </div>

              {criticEnabled ? (
                <div className='provider-fields'>
                  <div className='input-group'>
                    <label>Critic Provider</label>
                    <select value={criticProvider} onChange={e => setCriticProvider(e.target.value)}>
                      <option value='chatgpt'>ChatGPT</option>
                      <option value='gemini'>Gemini</option>
                    </select>
                  </div>
                  <div className='input-group'>
                    <label>Critic Model</label>
                    <select value={criticModel} onChange={e => setCriticModel(e.target.value)}>
                      {models[criticProvider as 'chatgpt' | 'gemini'].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <p className='critic-hint'>Enable to run a second-model refinement pass before final output.</p>
              )}

              {criticLoading && <div className='critic-loading'>⟳ Critic refining results…</div>}
            </div>
          </div>

          {promptType === 'custom' && (
            <textarea
              placeholder='Enter custom instructions for the AI...'
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              className='custom-prompt'
            />
          )}

          <div className='split' style={{ marginTop: '20px' }}>
            <textarea placeholder='Jira Details' value={jiraDetails} onChange={e => setJiraDetails(e.target.value)} />
            <textarea placeholder='Additional Context' value={additional} onChange={e => setAdditional(e.target.value)} />
          </div>

          <div className='toolbar'>
            <button onClick={onGenerate} disabled={generating} className={generating ? 'btn-loading' : ''}>
              {generating ? '⟳ Generating…' : 'Generate Test Cases'}
            </button>
            <button className='secondary' onClick={onGetReview} disabled={reviewLoading}>
              {reviewLoading ? '⟳ Reviewing…' : 'Get AI Review'}
            </button>
          </div>
        </section>

        {aiReview && (
          <AIReviewPanel
            review={aiReview}
            jiraStoryId={jiraStoryId}
            onClose={() => setAiReview(null)}
            onPublishToJira={onPublishReviewToJira}
          />
        )}

        {activeCases.length > 0 && (
          <section className='card'>
            <span className='section-label'>Step 3: Review & Publish</span>

            {refinedCases.length > 0 && (
              <div className='critic-banner'>
                🎯 Showing <strong>Critic-Refined</strong> results ({refinedCases.length} cases). Original: {testCases.length}.
              </div>
            )}

            <div className='table-container'>
              <table className='modern-table'>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input type='checkbox' onChange={e => toggleSelectAll(e.target.checked)} />
                    </th>
                    <th>Name</th>
                    <th>Pre-Condition</th>
                    <th>Steps</th>
                    <th>Expected</th>
                    <th style={{ width: '100px' }}>Priority</th>
                    <th style={{ width: '80px' }}>Actions</th>
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
                        <td><span className={`priority-badge ${tc.priority?.toLowerCase()}`}>{tc.priority}</span></td>
                        <td>
                          <button className='secondary' onClick={() => {
                            setExpandedId(expandedId === tc.id ? null : tc.id);
                            setTempEdit(tc);
                          }}>
                            {expandedId === tc.id ? 'Close' : 'Edit'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === tc.id && tempEdit && (
                        <tr>
                          <td colSpan={7} className='editor-panel'>
                            <div className='inline-editor-grid'>
                              <div className='input-group'><label>Pre-Condition</label><textarea value={tempEdit.preCondition} onChange={e => setTempEdit({ ...tempEdit, preCondition: e.target.value })} /></div>
                              <div className='input-group'><label>Test Steps</label><textarea style={{ minHeight: '120px' }} value={tempEdit.steps} onChange={e => setTempEdit({ ...tempEdit, steps: e.target.value })} /></div>
                              <div className='input-group' style={{ gridColumn: 'span 2' }}><label>Expected Result</label><textarea style={{ minHeight: '80px' }} value={tempEdit.expectedResult} onChange={e => setTempEdit({ ...tempEdit, expectedResult: e.target.value })} /></div>
                              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
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

            {/* Modern HTML Preview */}
            {showPreview && (
              <div className='preview-wrap'>
                <div className='preview-head'>
                  <h3>HTML Preview</h3>
                  <span>{activeCases.length} test case(s)</span>
                </div>
                <div className='preview-grid'>
                  {activeCases.map(tc => (
                    <article className='preview-card' key={`preview-${tc.id}`}>
                      <div className='preview-title'>
                        <strong>{tc.testName}</strong>
                        <span className={`priority-badge ${tc.priority?.toLowerCase()}`}>{tc.priority}</span>
                      </div>
                      <p><b>Objective:</b> {tc.objective}</p>
                      <p><b>Pre-condition:</b> {tc.preCondition}</p>
                      <p><b>Steps:</b> <pre>{tc.steps}</pre></p>
                      <p><b>Test Data:</b> <pre>{tc.testData}</pre></p>
                      <p><b>Expected:</b> {tc.expectedResult}</p>
                    </article>
                  ))}
                </div>
                <div className='toolbar' style={{ marginTop: 12 }}>
                  <button className='secondary' onClick={() => navigator.clipboard.writeText(JSON.stringify(activeCases, null, 2)).then(() => showToast('Preview JSON copied'))}>
                    Copy JSON
                  </button>
                  <button className='secondary' onClick={() => window.print()}>Print / Save PDF</button>
                </div>
              </div>
            )}

            <div className='toolbar'>
              <button onClick={() => startPublish('single')}>Publish Selected</button>
              <button className='secondary' onClick={() => startPublish('bulk')}>Bulk Publish All</button>
              <button className='secondary' onClick={() => setShowPreview(v => !v)}>{showPreview ? 'Hide HTML Preview' : 'Show HTML Preview'}</button>
              <button
                className='secondary'
                style={{ color: '#ef4444', marginLeft: 'auto' }}
                onClick={() => {
                  setTestCases([]);
                  setRefinedCases([]);
                  setShowPreview(false);
                  showToast('Workspace Cleared', 'info');
                }}
              >
                Clear All
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}