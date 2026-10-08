# Assessment local diagnostic

Generated from raw run `32982df5-10c4-4e5d-aecc-fb0e3cde5938` recorded at 2026-10-07T15:51:52.249Z.

This run is sequential local evidence. It does not establish capacity, an SLO, or an AWS saving.

- notCapacityEvidence: true
- offeredConcurrency: 1
- achievedConcurrency: 1
- postgres: PostgreSQL 17.11 on aarch64-unknown-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit

## Query budget

| Operation | Ceiling | Actual | Exceeded |
| --- | ---: | ---: | --- |
| start | 12 | 13 | true |
| questions | 4 | 4 | false |
| answers | 4 | 4 | false |
| save | 11 | 18 | true |
| submit | 10 | 13 | true |
| status | 3 | 3 | false |

HTTP writes authenticate and admit before the transaction, then revalidate the account inside it. CSRF adds a family lookup when a refresh cookie is present. Save uses separate selection and answer statements because a data-modifying CTE cannot see its own row changes and runtime has no UPDATE on answer selections.

## Samples

Outliers stay in the raw duration arrays. Missing percentiles are null.

| Operation | n | min | p50 | p95 | p99 | max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| start | 1 | 11.245083999999224 | 11.245083999999224 | 11.245083999999224 | 11.245083999999224 | 11.245083999999224 |
| questions | 6 | 3.680916999999681 | 4.140665999999328 | 4.619999999999891 | 4.619999999999891 | 4.619999999999891 |
| answers | 4 | 4.111458000000312 | 4.837207999999919 | 5.357916999999361 | 5.357916999999361 | 5.357916999999361 |
| save | 6 | 12.132416000000376 | 14.162583999999697 | 17.42462500000056 | 17.42462500000056 | 17.42462500000056 |
| submit | 1 | 11.153666000000158 | 11.153666000000158 | 11.153666000000158 | 11.153666000000158 | 11.153666000000158 |
| status | 18 | 3.0664999999999054 | 3.8047090000000026 | 8.174708999999893 | 8.174708999999893 | 8.174708999999893 |
