# Sandbox repo setup (for the automated webhook demo)

Copy these files into the root of your sandbox repo (`git-mind-test-sandbox`):

- `package.json`, `run-tests.js`, `.gitmind.json`
- `.github/workflows/ci.yml`

`main` must be green: every file in `bugs/` should be the *fixed* version on `main`.
A demo then looks like: open a PR that re-introduces one bug -> CI fails -> GitHub sends
`check_run` (conclusion=failure) -> Git-Mind clones the PR head, reproduces the failure,
patches, re-runs `node run-tests.js`, and opens a fix PR **into the failing PR's branch**.
