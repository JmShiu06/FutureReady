import csv
import json
import tempfile
import unittest
from pathlib import Path

from prepare_career_dataset import APPROVED_FEATURE_COLUMNS, audit_csv


def write_fixture(path: Path, overrides: dict[str, str] | None = None) -> None:
    values = {
        "Job_Role": "Software Engineer",
        "Education_Level": "Bachelor",
        "Years_Experience": "4.5",
        "Relevant_Experience_Years": "3",
        "Programming_Languages_Count": "4",
        "Primary_Programming_Language": "Python",
        "Frameworks_Count": "3",
        "Cloud_Platform_Experience": "AWS",
        "Databases_Count": "2",
        "Version_Control_Skill": "3",
        "Data_Science_Tools_Count": "1",
        "Cybersecurity_Skill_Level": "1",
        "DevOps_Skill_Level": "2",
        "Mobile_Dev_Skill_Level": "0",
        "AI_Skill_Level": "3",
        "ML_Skill_Level": "2",
        "DL_Skill_Level": "1",
        "GenAI_Skill_Level": "3",
        "LLM_Experience_Years": "1",
        "Prompt_Engineering_Skill": "3",
        "RAG_Experience": "true",
        "Fine_Tuning_Experience": "false",
        "Vector_DB_Experience": "1",
    }
    values.update(overrides or {})
    columns = ["Applicant_ID", "Gender", *APPROVED_FEATURE_COLUMNS, "Resume_Text"]
    with path.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=columns)
        writer.writeheader()
        writer.writerow(
            {
                "Applicant_ID": "synthetic-1",
                "Gender": "not used",
                **values,
                "Resume_Text": "must never appear in the report",
            }
        )


class PrepareCareerDatasetTests(unittest.TestCase):
    def test_report_is_aggregate_only_and_ignores_unapproved_columns(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "dataset.csv"
            write_fixture(source)
            report = audit_csv(source)

        self.assertEqual(report["status"], "passed")
        self.assertEqual(report["rows_seen"], 1)
        self.assertEqual(report["unapproved_columns_ignored"], 3)
        self.assertFalse(report["privacy"]["row_level_records_written"])
        encoded = json.dumps(report)
        self.assertNotIn("synthetic-1", encoded)
        self.assertNotIn("not used", encoded)
        self.assertNotIn("must never appear", encoded)

    def test_invalid_numeric_and_boolean_values_fail_without_exposing_values(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "dataset.csv"
            write_fixture(
                source,
                {
                    "Years_Experience": "-999",
                    "RAG_Experience": "private-data",
                },
            )
            report = audit_csv(source)

        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["quality"]["invalid_cells_by_approved_field"], {
            "RAG_Experience": 1,
            "Years_Experience": 1,
        })
        self.assertNotIn("private-data", json.dumps(report))

    def test_oversized_category_label_fails_quality_check(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "dataset.csv"
            write_fixture(source, {"Job_Role": "x" * 121})
            report = audit_csv(source)

        self.assertEqual(report["status"], "failed")
        self.assertEqual(
            report["quality"]["invalid_cells_by_approved_field"]["Job_Role"], 1
        )

    def test_missing_feature_column_fails_schema_check(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "dataset.csv"
            columns = [column for column in APPROVED_FEATURE_COLUMNS if column != "Job_Role"]
            with source.open("w", newline="", encoding="utf-8") as stream:
                csv.writer(stream).writerow(columns)
            report = audit_csv(source)

        self.assertEqual(report["status"], "failed")
        self.assertIn(
            "required_feature_columns_missing",
            report["quality"]["structural_errors"],
        )
        self.assertEqual(report["rows_seen"], 0)

    def test_empty_values_are_reported_without_imputation(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "dataset.csv"
            write_fixture(source, {"AI_Skill_Level": ""})
            report = audit_csv(source)

        self.assertEqual(report["status"], "passed")
        self.assertEqual(
            report["quality"]["missing_cells_by_approved_field"]["AI_Skill_Level"], 1
        )
        self.assertNotIn("AI_Skill_Level", report["quality"]["invalid_cells_by_approved_field"])


if __name__ == "__main__":
    unittest.main()
