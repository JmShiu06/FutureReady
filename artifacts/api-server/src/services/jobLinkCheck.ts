/** A captcha library reference on an otherwise valid search page is not a block. */
export function classifyJobPage(site: string, status: number, body: string) {
  if ([401, 403, 429, 999].includes(status)) return 'BLOCKED / UNVERIFIED';
  if (status < 200 || status >= 300) return 'BROKEN';
  const expected = site === 'LinkedIn'
    ? /jobs-search__results-list|jobs-search__left-rail|base-search-card|jobs-search-two-pane|jobs in malaysia/i.test(body)
    : /job|kerja/i.test(body);
  if (expected) return 'PASS';
  if (/captcha-challenge|verify you are human|<title>[^<]*(?:security verification|just a moment|authwall)/i.test(body))
    return 'BLOCKED / UNVERIFIED';
  return 'UNVERIFIED CONTENT';
}
