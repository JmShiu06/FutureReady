#!/usr/bin/env python3
"""Privacy-safe schema and quality audit for the reviewed synthetic Kaggle CSV.

This deliberately emits only aggregate counts. It does not create a row-level
training file or retain source records.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from pathlib import Path
from typing import Any


APPROVED_FEATURE_COLUMNS = (
    "Job_Role",
    "Education_Level",
    "Years_Experience",
    "Relevant_Experience_Years",
    "Programming_Languages_Count",
    "Primary_Programming_Language",
    "Frameworks_Count",
    "Cloud_Platform_Experience",
    "Databases_Count",
    "Version_Control_Skill",
    "Data_Science_Tools_Count",
    "Cybersecurity_Skill_Level",
    "DevOps_Skill_Level",
    "Mobile_Dev_Skill_Level",
    "AI_Skill_Level",
    "ML_Skill_Level",
    "DL_Skill_Level",
    "GenAI_Skill_Level",
    "LLM_Experience_Years",
    "Prompt_Engineering_Skill",
    "RAG_Experience",
    "Fine_Tuning_Experience",
    "Vector_DB_Experience",
)

NUMERIC_COLUMNS = (
    "Years_Experience",
    "Relevant_Experience_Years",
    "Programming_Languages_Count",
    "Frameworks_Count",
    "Databases_Count",
    "Version_Control_Skill",
    "Data_Science_Tools_Count",
    "Cybersecurity_Skill_Level",
    "DevOps_Skill_Level",
    "Mobile_Dev_Skill_Level",
    "AI_Skill_Level",
    "ML_Skill_Level",
    "DL_Skill_Level",
    "GenAI_Skill_Level",
    "LLM_Experience_Years",
    "Prompt_Engineering_Skill",
)

INTEGER_COLUMNS = (
    "Programming_Languages_Count",
    "Frameworks_Count",
    "Databases_Count",
    "Data_Science_Tools_Count",
)

BOOLEAN_COLUMNS = (
    "RAG_Experience",
    "Fine_Tuning_Experience",
    "Vector_DB_Experience",
)

CATEGORICAL_COLUMNS = (
    "Job_Role",
    "Education_Level",
    "Primary_Programming_Language",
    "Cloud_Platform_Experience",
)

BOOLEAN_VALUES = {"true", "false", "1", "0"}
PIPELINE_NAME = "privacy-safe-aggregate-audit-v1"


def _empty_counts(columns: tuple[str, ...]) -> dict[str, int]:
    return {column: 0 for column in columns}


def audit_csv(source: Path) -> dict[str, Any]:
    """Validate the approved feature schema and return an aggregate-only report."""
    missing_cells = _empty_counts(APPROVED_FEATURE_COLUMNS)
    invalid_cells = _empty_counts(
        NUMERIC_COLUMNS + BOOLEAN_COLUMNS + CATEGORICAL_COLUMNS
    )
    structural_errors: list[str] = []
    rows_seen = 0
    header: list[str] = []

    try:
        with source.open("r", newline="", encoding="utf-8-sig") as stream:
            reader = csv.DictReader(stream)
            header = reader.fieldnames or []

            if len(header) != len(set(header)):
                structural_errors.append("duplicate_column_names")

            missing_columns = [
                column for column in APPROVED_FEATURE_COLUMNS if column not in header
            ]
            if missing_columns:
                structural_errors.append("required_feature_columns_missing")
            else:
                for row in reader:
                    rows_seen += 1
                    if None in row:
                        structural_errors.append("row_has_more_values_than_header")

                    for column in APPROVED_FEATURE_COLUMNS:
                        value = row.get(column)
                        if value is None or not value.strip():
                            missing_cells[column] += 1
                            continue

                        if column in NUMERIC_COLUMNS:
                            try:
                                parsed = float(value)
                                if not math.isfinite(parsed) or parsed < 0:
                                    raise ValueError
                                if (
                                    column in INTEGER_COLUMNS
                                    and not parsed.is_integer()
                                ):
                                    raise ValueError
                            except ValueError:
                                invalid_cells[column] += 1
                        elif (
                            column in BOOLEAN_COLUMNS
                            and value.strip().casefold() not in BOOLEAN_VALUES
                        ):
                            invalid_cells[column] += 1
                        elif (
                            column in CATEGORICAL_COLUMNS and len(value.strip()) > 120
                        ):
                            # These are labels, not free-text resume fields.
                            invalid_cells[column] += 1

    except (OSError, UnicodeError, csv.Error) as error:
        # Do not include raw CSV values or local paths in diagnostics.
        structural_errors.append(f"input_unreadable:{type(error).__name__}")

    if not header:
        structural_errors.append("header_missing")
    if rows_seen == 0 and not structural_errors:
        structural_errors.append("no_data_rows")

    # Keep the report compact and avoid implying that missing fields were imputed.
    missing_summary = {key: value for key, value in missing_cells.items() if value}
    invalid_summary = {key: value for key, value in invalid_cells.items() if value}
    passed = not structural_errors and not invalid_summary

    return {
        "pipeline": PIPELINE_NAME,
        "source_dataset": "AI Resume Screening & Hiring Analytics Dataset, v3",
        "status": "passed" if passed else "failed",
        "rows_seen": rows_seen,
        "approved_feature_columns": list(APPROVED_FEATURE_COLUMNS),
        "unapproved_columns_ignored": max(0, len(header) - len(APPROVED_FEATURE_COLUMNS)),
        "quality": {
            "missing_cells_by_approved_field": missing_summary,
            "invalid_cells_by_approved_field": invalid_summary,
            "structural_errors": sorted(set(structural_errors)),
        },
        "privacy": {
            "row_level_records_written": False,
            "raw_resume_text_used": False,
            "personal_identifiers_used": False,
            "user_cv_data_used": False,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Audit the reviewed synthetic Kaggle CSV. Only aggregate quality "
            "counts are emitted; no training rows are produced."
        )
    )
    parser.add_argument("csv_path", type=Path, help="Local path to Kaggle dataset.csv")
    parser.add_argument(
        "--report",
        type=Path,
        help="Optional path for the aggregate JSON report; defaults to stdout",
    )
    args = parser.parse_args()

    if args.report and args.report.resolve() == args.csv_path.resolve():
        parser.error("--report must not overwrite the source CSV")

    report = audit_csv(args.csv_path)
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.report:
        try:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(encoded, encoding="utf-8")
        except OSError as error:
            print(f"Could not write aggregate report: {type(error).__name__}", file=sys.stderr)
            return 2
    else:
        print(encoded, end="")

    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
