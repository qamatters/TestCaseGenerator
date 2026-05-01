export default function Preview({ cases }: any) {
  return (
    <div className='previewGrid'>
      {cases.map((tc: any) => (
        <div className='previewCard' key={tc.id}>
          <div className='previewCardTop'>
            <strong>{tc.testName}</strong>
            <span className='pill'>{tc.priority}</span>
          </div>
          <div className='previewMeta'>
            <label>Steps</label>
            <pre>{tc.steps}</pre>
            <label>Expected</label>
            <pre>{tc.expectedResult}</pre>
          </div>
        </div>
      ))}
    </div>
  );
}