Sample CSV fixtures for browser testing the instructor dashboard.

Files in this directory:

- `valid_group_a_nora.csv`
- `valid_group_a_percy.csv`
- `valid_group_b_mira.csv`
- `valid_group_c_baxter.csv`
- `invalid_missing_report_comment.csv`
- `invalid_bad_score.csv`
- `invalid_missing_header.csv`
- `invalid_parse_error.csv`

Suggested test flow:

1. Upload the four `valid_*.csv` files together.
2. Confirm all four are accepted and charts render for groups `group_a`, `group_b`, and `group_c`.
3. Confirm zero values are included correctly from `valid_group_a_percy.csv`.
4. Upload the `invalid_*.csv` files and confirm the status panel rejects them with readable reasons.
