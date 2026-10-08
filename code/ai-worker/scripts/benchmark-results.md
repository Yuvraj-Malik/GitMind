# Fixer benchmark (partial run, 8 Oct 2026)

Model: gemini-2.5-flash, temperature 0, max 3 attempts, no push. New prompt: failing test sent as read-only context, untrusted output fenced, test edits rejected.

| Bug | Valid runs passed | Attempts used | Notes |
|---|---|---|---|
| 01-trivial | 3/3 | 1, 1, 1 | previously needed a retry |
| 02-off-by-one | 3/3 | 1, 1, 1 | |
| 03-logic-bug | 3/3 | 1, 1, 1 | |
| 04-array-method | 3/3 | 1, 1, 1 | |
| 05-cross-file | 1/1 | 1 | 2 further runs hit Gemini free-tier quota (429), not counted |
| 06-misleading-comment | not run | | quota exhausted |
| 07-wrong-error-handling | not run | | quota exhausted |
| 08-stateful | 1/1 | 1 | **previously always failed**; fixed by showing the model the test (it now adds `reset()`) |

**14/14 valid runs passed.** Re-run the full matrix with `npm run benchmark` once quota resets (or with a paid key) to complete 06, 07 and the 3-run minimum for 05 and 08.
