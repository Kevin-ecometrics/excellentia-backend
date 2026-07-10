import { makeQboApiCall } from './qbAuth.ts';

export async function findAllClasses(): Promise<any[]> {
  const endpoint = `/v3/company/${process.env.REALM_ID}/query?query=select * from Class MAXRESULTS 1000`;
  const data = await makeQboApiCall(endpoint);
  return data.QueryResponse?.Class ?? [];
}
