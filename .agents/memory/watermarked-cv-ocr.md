---
name: Watermarked CV OCR
description: Non-obvious tradeoff from private scanned-CV recognition experiments.
---

Do not assume global binarization or enlargement of a rasterized page improves watermarked CV recognition. Compare unchanged PDF renders at bounded resolutions and complementary page-layout assumptions first.

**Why:** On a real low-resolution, watermarked two-column scan, several global threshold variants lost more readable skill phrases than the original. Layout modes and independently rendered resolutions recovered complementary terms; enlarging an existing raster did not reproduce the detail-render result.

**How to apply:** Evaluate OCR changes using generated non-personal scans and, when supplied, a transient real-file reproduction. Compare only canonical-skill detections or aggregate metrics in diagnostics, never raw résumé text, and keep independent OCR passes separated so they cannot form invented cross-pass phrases.
