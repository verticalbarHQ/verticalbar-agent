---
name: netsuite-data
description: Answer questions about a customer's live NetSuite data through CrossCheck — SuiteQL, single records, saved searches and standard financial statements — as a NetSuite role the user is allowed to use. Use for "show me open invoices", "what does sales order 123 look like", "run my AR saved search", "trial balance for October". NOT for snapshot or process-mining analysis (use briefing) and NOT for changing NetSuite: every tool here reads.
---

# NetSuite data — live reads, as the user's own role

CrossCheck reaches the account through its own SuiteApp. Every answer comes from **live NetSuite**,
run **as a NetSuite role the signed-in user may use** in that environment. Each response carries
`runAs` (employee and role). Say whose permissions answered whenever a result could be partial.

## 1. Pick the environment and the role

1. `cc_workspaces` → `cc_environments` to find the `environmentId`.
2. Call the tool. Without `runAs`, the server picks the user's default role, or their only one.
3. If you get `PROFILE_SELECTION_REQUIRED`, show the listed roles (employee + role) and ask which to
   use. Set `runAs` to that role's `profileKey`. Suggest they set a default in CrossCheck
   (environment → Connection → NetSuite roles) so they are not asked again.
4. `NO_PROFILE_AVAILABLE` means no role is mapped to this user. An owner or admin maps roles on the
   environment's Connection page; you cannot fix it.
5. `PROFILE_NOT_PERMITTED` means the named role is not theirs to use. Do not retry with other names.
6. `cc_netsuite_run_as_profiles` lists their roles and default without touching NetSuite.

## 2. Find what to query before writing SuiteQL

Order: **catalog → custom → live probe.**

- `cc_netsuite_suiteql_metadata` with no arguments returns the standard catalog (key columns and
  joins for transaction, transactionline, transactionaccountingline, account, accountingperiod,
  entities, item, subsidiary, …) and the account's custom fields placed on the table they belong to.
- Call it with `tables: ["transaction"]` to probe every column the live table really has (custom fields
  included) before guessing a column name.
- Custom field placement follows NetSuite's field type: body fields are columns of `transaction`,
  column fields of `transactionline`, item fields of `item`, record fields of the custom record's
  own table (its script id in lower case). Entity fields may live on several entity tables; probe.

## 3. Write SuiteQL that works first time

- `cc_netsuite_suiteql` takes one `SELECT` (no `WITH`, no semicolons). It returns `page.totalCount`
  and `page.nextCursor`; send `cursor` back with the **same query** to continue. Prefer aggregates
  (`COUNT`, `SUM`, `GROUP BY`) over paging thousands of rows.
- Readable values: `BUILTIN.DF(t.entity)`, `BUILTIN.DF(t.status)`.
- Dates: `t.trandate >= TO_DATE('2026-10-01','YYYY-MM-DD')`. Periods: join `accountingperiod` on
  `t.postingperiod`; financial figures belong to the posting period, not the date.
- Lines: `transactionline.mainline = 'F'` for item/expense lines; amounts for the general ledger come
  from `transactionaccountingline` with `posting = 'T'` and an `accountingbook`.
- On a `QUERY_ERROR`, read NetSuite's message, fix the one identifier it names, and retry once.

## 4. Records and saved searches

- `cc_netsuite_record_get` returns a record's fields and sublists. **Opening a record runs its
  before-load scripts and may start workflows, as opening it in NetSuite does.** Tell the user
  before reading a record type whose workflows they care about, and limit `fields`/`sublists` to keep
  large records small. It never saves. A `truncated` answer carries `resume`: call again with
  exactly its `fields`, `sublists` and `lineStart` to continue.
- `cc_netsuite_saved_searches` lists the searches **this role** can see. `cc_netsuite_saved_search_run`
  returns one page with column labels. **Zero rows can mean the role lacks permission on the record
  type** — NetSuite does not report that as an error. Say so instead of "there is no data".
- `cc_netsuite_suiteql` gives `nextCursor` only when the query has a top-level `ORDER BY`; order by a
  unique key (such as `id`) so pages neither repeat nor skip rows. A summary or joined saved search
  answers one page (`unpageable`); raise `pageSize` up to 1000 instead.

## 5. Financial statements

- `cc_netsuite_reports` lists them; `cc_netsuite_report_filters` returns subsidiaries, books, periods
  and currencies; `cc_netsuite_report_run` builds one:
  - `trial_balance`, `balance_sheet`: `periodEnd`
  - `income_statement`: `periodStart`, `periodEnd`
  - `ar_aging`, `ap_aging`: as of today only — NetSuite keeps current open amounts, so a past-date aging is not offered
- Always relay the response `notes`: the statements are rebuilt from data, customized row layouts
  and custom reports are not reflected, and amounts are base currency (multi-currency is approximate).

## 6. When it does not work

| Code | Meaning | Do |
|---|---|---|
| `CONCURRENCY_LIMIT` (503) | The account is busy (collection or other users) | Wait a little and retry once |
| `ADMISSION_UNAVAILABLE` (503) | CrossCheck could not admit the call | Tell the user; do not loop |
| `CAPABILITY_UNAVAILABLE` (422) | The account's CrossCheck SuiteApp is older than this tool | Tell the user the SuiteApp needs an update |
| `QUERY_TIMEOUT` (504) | NetSuite did not answer in time | Narrow the query (filters, aggregates) |
| `RECORD_ACCESS_DENIED` (403) | The role cannot open that record | Say which role was used |
