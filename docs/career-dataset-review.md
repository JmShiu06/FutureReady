# Career-analysis dataset review

**Reviewed:** 2026-10-21  
**Decision:** do not ingest into the application or train career scores from this dataset.

## Dataset and access

- Dataset: [AI Resume Screening & Hiring Analytics Dataset](https://www.kaggle.com/datasets/sarveshchhetri/ai-resume-screening-and-hiring-analytics-dataset)
- Publisher: Sarvesh Chhetri
- Reviewed release: version 3; the page lists `dataset.csv` (136.75 MB), `data_dictionary.csv`, and `FEATURE_DESCRIPTIONS.md`.
- The public dataset page and data dictionary were accessible without signing in. A small byte-range request confirmed the CSV download endpoint responds with CSV content; the full 136.75 MB file was not copied into the project.
- The Kaggle page identifies the license as Apache 2.0. Keep the dataset's license and attribution with any permitted research copy; this review is not legal advice.

## Suitability and privacy assessment

The publisher describes the dataset as entirely synthetic, with no real candidates, companies, or resumes. It is intended for educational, research, and portfolio/ML practice, and explicitly says it is not for training production hiring systems on real populations.

The dataset is not suitable evidence for individual career readiness, employability, skill proficiency, or real workforce trends. It represents a simulated multinational hiring pipeline rather than the FutureReady product's career-development context. The data dictionary includes demographics and other candidate-profile attributes, assessment/interview scores, application-stage information, and generated hiring outputs. The publisher's business rules describe correlations between input features and outcomes (for example, ATS score affects shortlisting, and assessment scores feed interview scores). A model trained on those targets could reproduce the generator rules or leak downstream hiring information; a held-out split from the same synthetic generator would not establish validity for real people.

Although the source is synthetic and Apache 2.0 licensed, the project will not bundle its candidate-like rows. The application will continue to process a user's CV locally in memory, send no CV text to external services, and persist neither raw CV text nor personal records.

## Preparation and quality-check pipeline

`scripts/src/prepare_career_dataset.py` is an offline, standard-library-only schema and quality audit for a manually obtained copy of the reviewed CSV. It is intentionally not a model-training or row-export tool:

1. Confirm that all approved role, education, experience, and technical-skill fields exist and that column names are unique.
2. Stream the file and inspect only those allowlisted fields. Other columns—including identifiers, demographics, resume attributes, assessments, and hiring outcomes—are ignored.
3. Check numeric values for parseability, finiteness, and non-negativity; count fields must be whole numbers. Check boolean formats and reject oversized category labels.
4. Report aggregate row counts, missing-cell counts, invalid-cell counts, and schema errors only. Missing values are reported, not imputed.
5. Write no candidate-level data. The report never includes cell values or the source path.

The Kaggle page reports 120 dataset columns, while its published data dictionary contains 116 field entries. The pipeline therefore requires the approved input fields, ignores the remainder, and reports no unapproved column names or values. Confirm the schema again if the publisher releases a new version.

Run against a copy downloaded directly from the publisher; do not check source or generated reports into Git:

```sh
python scripts/src/prepare_career_dataset.py /path/to/dataset.csv
python scripts/src/prepare_career_dataset.py /path/to/dataset.csv --report /tmp/career-dataset-audit.json
python -m unittest discover -s scripts/src -p 'test_*.py'
```

## Model and API release gate

No model is trained or exposed from this dataset. Before reconsidering any score or prediction, a future data review must first approve a dataset that is representative of the product's intended population and purpose, with documented provenance, rights, privacy safeguards, and meaningful labels. Any proposed model then needs a predeclared held-out evaluation, leakage checks, subgroup/error analysis, and product-level review before output is exposed.

The current API's exact-skill overlap is a deterministic comparison against the separately bundled role-skill list. It is not a trained prediction or validated readiness assessment. Readiness, candidate level, and similar-profile results remain unavailable rather than fabricated.
