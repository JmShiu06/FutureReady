# Skill-learning catalog provenance

`skill_learning_catalog.json.gz` is a compact, read-only projection of `combined_dataset.json` from the user-supplied `archive_(2)_1792601008412.zip`.

- Input rows: 13,793.
- Included rows: 13,783 records with a title, HTTPS URL, and at least one skill tag.
- Included fields: title, provider, record type, skill tags, source level, rating when numeric, source duration value, description, and source row identifier.
- Descriptions are stripped of markup and truncated to 1,800 characters.
- The compressed projection is about 8 MB; the uncompressed JSON is about 27 MB.
- The archive labels Coursera/edX providers, but does not establish the current availability, correctness, rating provenance, duration units, prerequisites, licensing, or course outcomes for each record. These records are not verified courses.
- This projection does not include personally identifiable CV/profile records.

This dataset is retained only as an inactive reference. The Python Skill Learning Recommendation Engine, its semantic search, and its course recommendation and monthly roadmap endpoints have been removed. No active service loads or indexes this projection.

The existing PostgreSQL course-table definition is intentionally retained to avoid dropping stored data during publishing. The original CV/skill-analysis engine and the independently reviewed learning-resource library remain separate and unchanged.
