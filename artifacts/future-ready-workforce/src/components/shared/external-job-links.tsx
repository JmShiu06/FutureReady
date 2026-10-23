import React from 'react';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { externalJobSearchLinks, externalJobSiteNote, fictionalListingLabel } from '@workspace/workforce-evidence';

const h = React.createElement;

/** Exact fictional badge used on every listing card and detail page. */
export function SampleListingBadge({ testId }: { testId: string }) {
  return h('span', { className: 'jl-fictional', 'data-testid': testId }, fictionalListingLabel);
}

type Props = { occupationTitle: string; testIdSuffix: string; compact?: boolean };

/** Links to public job sites. Never an application for a fictional listing. */
export function ExternalJobLinks({ occupationTitle, testIdSuffix, compact = false }: Props) {
  const [primary, ...secondary] = externalJobSearchLinks(occupationTitle);
  return h('div', { className: `ext-jobs${compact ? ' compact' : ''}`, 'data-testid': `external-job-links-${testIdSuffix}` },
    h('div', { className: 'ext-jobs-row' },
      h('a', {
        className: 'btn btn-primary btn-small ext-jobs-primary', href: primary.url, target: '_blank', rel: 'noopener noreferrer',
        'aria-label': `${primary.label} for ${occupationTitle} in Malaysia (opens in new tab)`, 'data-testid': `link-linkedin-${testIdSuffix}`,
      }, primary.label, ' ', h(ArrowUpRight, { size: 12, 'aria-hidden': true })),
      ...secondary.map(link => h('a', {
        key: link.site, className: 'ext-jobs-secondary', href: link.url, target: '_blank', rel: 'noopener noreferrer',
        'aria-label': `${link.label} homepage, not a search for this occupation (opens in new tab)`,
        'data-testid': `link-${link.site.toLowerCase().replace(/[^a-z]+/g, '-')}-${testIdSuffix}`,
      }, `${link.label} (homepage)`, ' ', h(ExternalLink, { size: 10, 'aria-hidden': true }))),
    ),
    h('p', { className: 'ext-jobs-note', 'data-testid': `text-external-note-${testIdSuffix}` },
      externalJobSiteNote,
      ` LinkedIn searches “${occupationTitle}” in Malaysia. JobStreet Malaysia and MYFutureJobs links open the provider homepage only; a title-specific search could not be confirmed, so search there yourself.`),
  );
}
