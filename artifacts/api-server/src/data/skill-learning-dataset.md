# Skill-learning catalog provenance

`skill_learning_catalog.json.gz` is a compact, read-only projection of `combined_dataset.json` from the user-supplied `archive_(2)_1792601008412.zip`.

- Input rows: 13,793.
- Included rows: 13,783 records with a title, HTTPS URL, and at least one skill tag.
- Included fields: title, provider, record type, skill tags, source level, rating when numeric, source duration value, description, and source row identifier.
- Descriptions are stripped of markup and truncated to 1,800 characters.
- The compressed projection is about 8 MB; the uncompressed JSON is about 27 MB.
- The archive labels Coursera/edX providers, but does not establish the current availability, correctness, rating provenance, duration units, prerequisites, licensing, or course outcomes for each record. The API reports these limitations and does not call the rows verified courses.
- This projection does not include personally identifiable CV/profile records.

The Python Skill Learning Recommendation Engine loads this projection into PostgreSQL and builds sentence-transformer embeddings in a derived Chroma index. Course descriptions and skill tags are used because the source has no separate learning-outcome field. The original CV/skill-analysis engine is not changed.
