# DOSM data integration — Milestone 1

## Source verification

Checked on 2026-10-21. All URLs supplied for this milestone were accessible.

| Source | Result | Use in this milestone |
| --- | --- | --- |
| [OpenDOSM monthly principal labour-force catalogue](https://open.dosm.gov.my/data-catalogue/lfs_month) | HTTP 200 | Dataset description, variables, update schedule, methodology, caveats and license |
| [OpenDOSM API documentation](https://developer.data.gov.my/static-api/opendosm) | HTTP 200 | Canonical API endpoint and query syntax |
| [Supplied `lfs_month` API example](https://api.data.gov.my/data-catalogue?id=lfs_month&limit=3) | HTTP 301 followed by HTTP 200 | Returned the expected dataset records; it redirects to a trailing-slash URL |
| [Canonical `lfs_month` API endpoint](https://api.data.gov.my/opendosm?id=lfs_month&limit=3) | HTTP 200 | Used by the server adapter |
| [DOSM Job Market Insights Q1 2026 release](https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q12026) | HTTP 200 | Q1 report and release date |
| [DOSM Q1 2026 data workbook](https://www.dosm.gov.my/portal-main/release-document-log?release_document_id=19819) | HTTP 200; resolves to XLSX | Manually reviewed Q1 occupation-group counts |
| [DOSM Job Market Insights Q2 2026 release](https://www.dosm.gov.my/portal-main/release-content/big-data-analytics-job-market-insights-q22026) | HTTP 200 | Q2 report and release date |
| [DOSM Q2 2026 data workbook](https://www.dosm.gov.my/portal-main/release-document-log?release_document_id=20742) | HTTP 200; resolves to XLSX | Manually reviewed Q1/Q2 occupation-group counts |

No unavailable link required an alternate source. The supplied API sample URL redirects, so the adapter uses the documented OpenDOSM endpoint on the same official `data.gov.my` domain.

## Permitted use and attribution

- The `lfs_month` catalogue states that the dataset is released under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/).
- DOSM's [Government Open Data Terms of Use 1.0](https://www.dosm.gov.my/assets/img/article/Terms-of-Use-Government-Open-Data-1-Appendix-B.pdf) permits copying, publishing, adapting, commercial/non-commercial use and combining portal data. It requires a source attribution and a link to the terms.
- Attribution shown with DOSM data: **Data source: Department of Statistics Malaysia.**
- The app links to the source release/catalogue and the applicable terms. It does not reproduce report graphics.

## Included data and limits

### Monthly labour-force series

The adapter retrieves `lfs_month` through the OpenDOSM API, validates the returned records and caches them in memory for six hours. Counts are in thousands of people; rate measures are percentages. API rows include an observation month but do not include a per-row publication date, so `publicationDate` remains `null` rather than being inferred. Retrieval time is recorded on every response.

This dataset is a **national labour-force context series**, not occupation-level vacancy data or skill demand. The catalogue notes that observations before 2025 use 2010 Census population benchmarks and observations from 2025 use 2020 Census benchmarks; comparisons across that boundary should be treated cautiously.

### Job Market Insights occupation groups

The checked-in snapshot contains the nine named major occupation groups for 2026 Q1 and Q2. Q1 values were cross-checked between both quarter workbooks and matched. The report publication dates are 2026-06-25 (Q1) and 2026-08-18 (Q2). The snapshot was reviewed on 2026-10-21.

The source measure is online job offerings advertised through major private recruitment platforms. It is not a count of all vacancies, employed people, future demand or skill requirements. No skill-demand estimates or unsupported growth rates are derived from it. The workbook's `Unclassified` row is omitted because Q2 reports a dash rather than a comparable observation; it is not converted to zero.

The Q1/Q2 report workbooks are reviewed static records in this milestone. The refresh button refreshes the monthly OpenDOSM API series only; it does not claim to download or update quarterly workbooks.
