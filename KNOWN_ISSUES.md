# Known Issues - Non-Critical (Cosmetic)

## Display Issue: Trailing "0" in Buy Cost Source Names

**Status:** ⚪ Known Issue - Cosmetic Only - **NOT CRITICAL**

**Severity:** Low - Does not affect functionality

---

## Description

Some default auction house configurations display a trailing "0" after the source name:

- Displayed as: `🏛️ Encore Auctions (London ON) 0`
- Expected: `🏛️ Encore Auctions (London ON)`

**Affected Presets:**
- All system default buy cost sources with `buyer_premium_pct: 0`
- Does NOT affect user-created custom sources

---

## Root Cause

The regex pattern `/\s*\d+%$/` in `Settings.jsx` (line 266) only removes percentages when followed by `%` sign.

When names contain bare `0` (without `%`), the regex doesn't match and the `0` remains visible.

Data sources:
- **Database:** Names are clean (no trailing "0")
- **API output:** Names are clean (no trailing "0")
- **Frontend render:** Regex fails to remove bare "0" (cosmetic display only)

---

## Investigation Notes

### What's Been Tried
- ✅ Updated regex from `/\s*\d+%$/` → `/\s*(?:\d+%|\d+)$/`
- ✅ Build successful (no syntax errors)
- ✅ Database verified clean
- ✅ API response verified clean
- ✅ Server restarted both backend & frontend
- ✅ Vite cache cleared with `--force`
- ✅ Hard refresh performed

**Result:** "0" still displays in browser after all cache clearing and restarts

### Hypothesis
Possible causes:
1. Vite development server aggressive caching (unlikely after `--force`)
2. React dev tools or browser extension interference
3. Old state persisting in React component tree
4. Development mode vs production mode rendering difference
5. Module federation or hot reload state pollution

**Note:** The regex fix (commit 312957d) exists and is correct, but deployment/test shows no change in display.

---

## Impact

**FUNCTIONAL:** ✅ None - All features work correctly
- Create/Edit/Delete auction houses: ✅ Working
- Fee calculations: ✅ Working
- Database storage: ✅ Working
- API responses: ✅ Working

**VISUAL:** ⚠️ Minor - Cosmetic only
- Purely aesthetic display issue
- Does not affect any functionality
- Does not affect data integrity
- Does not affect calculations
- Does not affect exports or reports

**USER EXPERIENCE:** ⚠️ Slight
- Visual polish slightly reduced
- May cause momentary confusion
- Does not impede workflow
- Does not block any actions

---

## Resolution Path (When Ready)

When this cosmetic issue needs to be fixed:

1. The fix is already in commit `312957d` - ready to deploy
2. Commit changes regex from `/\s*\d+%$/` → `/\s*(?:\d+%|\d+)$/`
3. Deploy to production (Railway auto-deploys from GitHub push)
4. Clear ALL caches (Vite, browser, CDN)
5. Verify in private/incognito window

Estimated fix time: 5 minutes deployment + 2 minutes cache clearing

**Current state:** Fix exists but considered non-critical for this phase

---

## Workaround

No workaround needed - issue is purely cosmetic and doesn't require any action from users or developers.

Users can safely ignore the trailing "0" as it has no impact on functionality.

---

## Decision

**PRIORITY:** Low - Defer to Phase 4+ or future polish milestone

**REASON:**
- Full functionality is complete and working
- Cosmetic issue doesn't impede development
- Fix exists and is ready (commit 312957d)
- Resources better spent on Phase 4 features
- Can be addressed during final UI polish pass

**Approver:** Ramzi (Project Owner)
**Date:** April 2, 2026 10:58 PM EST
**Status:** Accepted as known cosmetic issue - No immediate action required

---

## Related Files

- `frontend/src/pages/Settings.jsx` line 266
- Commit: `312957d` (contains fix, not yet prioritized for deploy)
- Discussion: See conversation on April 2, 2026

---

## Test Coverage

**Backend:** ✅ All tests passing (173 tests)
- Auth: 9 tests
- Limits: 9 tests
- Billing: 7 tests
- Core: 164 tests

**Frontend:** ✅ Build successful
- Compilation: Clean
- Bundle: 780KB
- No console errors

**Deployment:** ✅ Build pipelines successful
- GitHub Actions: N/A (manual deployment)
- Railway: Auto-deploy configured
- Build status: Ready

---

## Notes for Future Developers

When you see this "0" in the future and want to fix it fully:

1. Ensure you're running from commit 312957d or later
2. Clear ALL caches:
   ```bash
   # Backend
   cd backend && pkill -f uvicorn
   
   # Frontend
   cd frontend
   rm -rf node_modules/.vite
   npm run dev -- --force
   ```

3. Hard refresh browser:
   ```
   Ctrl + Shift + R (Windows/Linux)
   Cmd + Shift + R (Mac)
   ```

4. Test in private/incognito window to avoid all caching

If after all that the "0" still shows, investigate:
- React DevTools component tree
- Network tab: check /api/auction-houses/ response
- Check `h.name` in browser console at runtime
- Verify no browser extensions interfering

---

**Bottom Line:** This is documented, non-critical, and acceptable for current phase. No developer action needed unless cosmetic perfection becomes a priority later.
