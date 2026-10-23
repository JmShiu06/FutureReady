---
name: Listing completeness
description: Why catalogue loading and profile match batches must fail atomically.
---

Treat complete-catalogue search/counts and global match ranking as all-or-error operations. A failed page, incomplete score batch or exceeded loading bound must not appear as fewer available listings or fewer matches.

**Why:** A successful partial response would look like a legitimate search result, silently hiding opportunities. The catalogue's small initial size is not a safe assumption for future growth.

**How to apply:** Preserve explicit failure and retry states as pagination evolves. If catalogue size outgrows browser loading, move filtering/counting/ranking server-side rather than silently truncating or removing safety bounds.
