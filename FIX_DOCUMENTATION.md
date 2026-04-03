# Fix: Remove "0" from Auction House Names

## Problem
Auction house names were displaying a trailing "0" inline with the title (e.g., "Direct Wholesale / Bulk Purchase 0", "Estate Sale / Liquidation 0").

**Position:** Immediately after the source name, same line, same font size/style as title  
**Value:** Bare "0" (not "0%", just "0")  
**Cause:** `buyer_premium_pct: 0` being rendered as part of the name

## Root Cause
The regex on line 266 of `Settings.jsx` was:
```javascript
h.name.replace(/\s*\d+%$/, '')
```

This regex only removed trailing percentages like "13%", but not bare numbers like "0" or "0%" (when the % is missing in the data).

## Solution
Updated the regex to:
```javascript
h.name.replace(/\s*(?:\d+%|\d+)$/, '')
```

This pattern now removes:
- `"0"` (bare zero)
- `"0%"` (zero percentage)
- `"13%"` (percentage with digits)
- `"123"` (any trailing digits)
- All of the above with optional leading spaces

## Verification
✅ Build successful: Frontend bundle builds without errors  
✅ Logic correct: Regex removes all numeric suffixes  
📋 Next: Test in browser to confirm visual fix

---
## Files Modified
- `/Users/ramzi/Documents/filpIQ antigravity openrouter/frontend/src/pages/Settings.jsx` (line 266)

---
## How to Verify Fix
1. Open Settings → Buy Cost Sources
2. Look at preset configurations:
   - "Direct Wholesale / Bulk Purchase" (no "0")
   - "Estate Sale / Liquidation" (no "0")
   - "Private Seller / Kijiji" (no "0")
   - "Facebook Marketplace" (no "0")
   - "Custom/Reseller Buy Cost" (no "0")
3. All names should appear clean without trailing numbers
4. The "0" values should still appear in the **expanded details** view where they belong

---
## Technical Details
**Before:** `/\s*\d+%$/`
- Matches: " 13%", " 0%" (requires % sign)
- Does NOT match: " 0", " 123"

**After:** `/\s*(?:\d+%|\d+)$/`
- Matches: " 13%", " 0%", " 0", " 123" (with or without %)
- Captures: optional spaces + (digits with % OR just digits) at end of string

**Alternative solution considered:** `/\s*\d+%?$/`
- Matches: optional spaces + digits + optional % at end
- Simpler but technically incorrect (makes % optional for ALL digits)
- Chosen solution is more explicit and readable

---
## Complete Backup Exists
**Before this fix:** Tag `v0.5.2-stable-20260402-222503` created  
**Backup location:** `.backups/v0.5.2-stable-v0.5.2-stable-20260402-222504/` (171MB)  
**Documentation:** `BACKUP_DOCUMENTATION.md`

You can always restore if needed:
```bash
git checkout v0.5.2-stable-20260402-222503 -- frontend/src/pages/Settings.jsx
```

---
**Created:** April 2, 2026 10:45 PM EST  
**Agent:** Kimi K2.5  
**Status:** ✅ Ready for testing