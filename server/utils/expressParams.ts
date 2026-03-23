/**
 * Express 5 types may widen dynamic route params to `string | string[]`.
 * Use this helper when a single string is required.
 */
export function firstRouteParam(param: string | string[] | undefined): string | undefined {
  if (param == null) return undefined;
  return Array.isArray(param) ? param[0] : param;
}
