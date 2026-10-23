import React from 'react';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { externalJobSearchLinks } from '@workspace/workforce-evidence';
import { useI18n } from '@/i18n/i18n-context';

const h = React.createElement;

/** Exact fictional badge used on every listing card and detail page. */
export function SampleListingBadge({ testId }: { testId: string }) {
  const { t } = useI18n();
  return h('span', { className: 'jl-fictional', 'data-testid': testId }, t('detail.sampleBadge'));
}

type Props = { occupationTitle: string; testIdSuffix: string; compact?: boolean };

/** Links to public job sites. Never an application for a fictional listing. */
export function ExternalJobLinks({ occupationTitle, testIdSuffix, compact = false }: Props) {
  const { t } = useI18n();
  const [primary, ...secondary] = externalJobSearchLinks(occupationTitle);
  return h('div', { className: `ext-jobs${compact ? ' compact' : ''}`, 'data-testid': `external-job-links-${testIdSuffix}` },
    h('div', { className: 'ext-jobs-row' },
      h('a', {
        className: 'btn btn-primary btn-small ext-jobs-primary', href: primary.url, target: '_blank', rel: 'noopener noreferrer',
        'aria-label': t('detail.searchAria', { title: occupationTitle, newTab: t('common.newTab') }), 'data-testid': `link-linkedin-${testIdSuffix}`,
      }, t('detail.linkedin'), ' ', h(ArrowUpRight, { size: 12, 'aria-hidden': true })),
      ...secondary.map(link => h('a', {
        key: link.site, className: 'ext-jobs-secondary', href: link.url, target: '_blank', rel: 'noopener noreferrer',
        'aria-label': t('detail.homepageAria', { site: link.site, newTab: t('common.newTab') }),
        'data-testid': `link-${link.site.toLowerCase().replace(/[^a-z]+/g, '-')}-${testIdSuffix}`,
      }, t('detail.homepage', { site: link.site }), ' ', h(ExternalLink, { size: 10, 'aria-hidden': true }))),
    ),
    h('p', { className: 'ext-jobs-note', 'data-testid': `text-external-note-${testIdSuffix}` },
      t('detail.externalNote', { title: occupationTitle })),
  );
}
