"""Exercise the cleanup with real uv and isolated package metadata, not pip."""
import csv
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
PYTHON = ROOT / ".pythonlibs/bin/python"
CLEANUP = ROOT / "scripts/remove-retired-chromadb.sh"


@unittest.skipUnless(PYTHON.exists() and shutil.which("uv"), "requires workspace Python and uv")
class RetiredChromaDBCleanupTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.packages = Path(self.temporary.name)
        # Do not inherit the system pip wrapper's PYTHONPATH. This is a package
        # metadata fixture, not a new virtual environment or a ChromaDB install.
        self.env = {
            **os.environ,
            "PYTHONPATH": str(self.packages),
            "PYTHONNOUSERSITE": "1",
        }

    def add_distribution(self, name):
        module = self.packages / name / "__init__.py"
        module.parent.mkdir()
        module.write_text("")
        metadata = self.packages / f"{name}-0.0.0.dist-info"
        metadata.mkdir()
        (metadata / "METADATA").write_text(
            f"Metadata-Version: 2.1\nName: {name}\nVersion: 0.0.0\n"
        )
        (metadata / "INSTALLER").write_text("uv\n")
        files = [module, metadata / "METADATA", metadata / "INSTALLER", metadata / "RECORD"]
        with (metadata / "RECORD").open("w") as stream:
            writer = csv.writer(stream)
            for file in files:
                writer.writerow([str(file.relative_to(self.packages)), "", ""])

    def run_cleanup(self, env=None):
        return subprocess.run(
            ["bash", str(CLEANUP)],
            env=env or self.env,
            capture_output=True,
            text=True,
        )

    def test_removes_only_chromadb_without_pip_and_is_idempotent(self):
        no_pip = subprocess.run(
            [str(PYTHON), "-c", "import importlib.util; assert importlib.util.find_spec('pip') is None"],
            env=self.env, capture_output=True, text=True,
        )
        self.assertEqual(no_pip.returncode, 0, no_pip.stderr)
        self.add_distribution("chromadb")
        self.add_distribution("retained_package")
        result = self.run_cleanup()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.packages / "chromadb").exists())
        self.assertFalse((self.packages / "chromadb-0.0.0.dist-info").exists())
        self.assertTrue((self.packages / "retained_package/__init__.py").exists())
        self.assertTrue((self.packages / "retained_package-0.0.0.dist-info/METADATA").exists())
        result = self.run_cleanup()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_already_clean_environment_is_unchanged(self):
        self.add_distribution("retained_package")
        before = sorted(str(file.relative_to(self.packages)) for file in self.packages.rglob("*"))
        result = self.run_cleanup()
        self.assertEqual(result.returncode, 0, result.stderr)
        after = sorted(str(file.relative_to(self.packages)) for file in self.packages.rglob("*"))
        self.assertEqual(before, after)

    def test_post_uninstall_check_rejects_a_noop_uninstaller(self):
        self.add_distribution("chromadb")
        bin_dir = self.packages / "bin"
        bin_dir.mkdir()
        uv = bin_dir / "uv"
        uv.write_text("#!/bin/sh\nexit 0\n")
        uv.chmod(0o755)
        result = self.run_cleanup({**self.env, "PATH": f"{bin_dir}:{self.env['PATH']}"})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("ChromaDB is still installed after cleanup", result.stderr)


if __name__ == "__main__":
    unittest.main()
