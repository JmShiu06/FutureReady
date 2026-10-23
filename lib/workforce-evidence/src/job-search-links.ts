/** External searches, never application links for our fictional records. */
export const externalJobSiteNote = "Opens an external job site. FutureReady doesn't list, verify or apply for real vacancies.";
export const fictionalListingLabel = "Sample listing (fictional)";

export function externalJobSearchLinks(occupationTitle: string) {
  return [
    { site: 'LinkedIn', label: 'See real jobs on LinkedIn',
      url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(occupationTitle.trim())}&location=Malaysia`,
      kind: 'occupation-search' as const },
    // The title-specific search endpoints could not be confirmed (HTTP 403).
    // Use public job-search homepages instead of inventing query parameters.
    { site: 'JobStreet Malaysia', label: 'JobStreet Malaysia', url: 'https://my.jobstreet.com/', kind: 'homepage' as const },
    { site: 'MYFutureJobs', label: 'MYFutureJobs', url: 'https://myfuturejobs.gov.my/', kind: 'homepage' as const },
  ];
}
