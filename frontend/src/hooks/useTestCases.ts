import { useState } from 'react';

export function useTestCases() {
  const [testCases, setTestCases] = useState<any[]>([]);
  const [refinedCases, setRefinedCases] = useState<any[]>([]);

  const activeCases = refinedCases.length ? refinedCases : testCases;

  return {
    testCases,
    refinedCases,
    activeCases,
    setTestCases,
    setRefinedCases
  };
}