# TODO: Fix npm audit issues and deprecated packages

## Steps to Complete

- [x] Run `npm audit fix` to address the esbuild vulnerability
- [x] Replace json2csv with fast-csv: Install fast-csv, update import in server/src/routes.ts, adjust CSV parsing code
- [x] Update other dependencies where possible to resolve deprecations (rimraf, lodash.get, inflight, glob - check if npm audit fix handles them)
- [ ] Note validator vulnerabilities (no fix available, may require manual review or alternative libraries)
- [ ] Test CSV export functionality after changes
- [ ] Run npm audit again to verify fixes

## Progress Tracking

- Started: 2023-10-01 12:00 PM
- Completed steps will be marked with [x]
