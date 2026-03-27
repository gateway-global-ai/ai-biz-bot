/**
 * Creates an orchestration run for single-agent create; required by POST /api/agents.
 */
export async function fetchOrchestrationRunForAgentCreate(
  siteConfigId: string,
): Promise<string> {
  const res = await fetch('/api/intelligence/orchestration-runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ siteConfigId }),
  });
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  const data = (await res.json()) as { orchestrationRunId?: string };
  if (!data.orchestrationRunId) {
    throw new Error('Missing orchestrationRunId from server');
  }
  return data.orchestrationRunId;
}
