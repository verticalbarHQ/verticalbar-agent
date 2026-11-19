# Restore selection

Use the snapshotId from the selected Shopify environment. `types` is an array of type names,
for example `["Product","ProductVariant"]`. `items` maps type names to Shopify object ids, for example
`{"Product":["gid://shopify/Product/123"]}`. Select at least types or items.

At most 100 types and 2,000 ids per type are accepted. Names and ids must come from the snapshot's
items. Read every page needed for the confirmed selection. Do not broaden an incomplete selection.
Product item selections also restore their backed-up variants. For a whole-product restore,
select Product and ProductVariant together; the server rejects whole-product fields without their
variants. Explain that combined scope before obtaining confirmation.
The tool sends these values as the Restore selection; marketing consent retains the server's
existing keep behavior. A saved sync definition owns its source, target, selection and commands;
inspect and explain that definition before running it. No ad hoc sync definition is created here.

## Store changes

| Operation or selection | Effect on Shopify |
| --- | --- |
| Snapshot | Reads store data to create a backup; does not apply restored or synced values to store records. |
| Restore | Applies supported backed-up values in the same store. Can create missing records, overwrite existing values and replace nested data under object-specific rules. Target-only records are kept; this is not a promise to rewind the entire store. |
| Saved sync | Captures fresh source data for the run, matches it to the target and applies the saved fields and commands. NEW creates only; MERGE updates or creates; UPDATE updates only; DELETE removes; REPLACE deletes and recreates; IGNORE skips. Available commands depend on the object. Orders and Draft Orders default to NEW, most other objects to MERGE. |
| Linked objects | If the saved definition enables withReferences, missing referenced objects can be created with their full supported data. Explain this additional scope too. |
| Gift cards | Restore can create a new card with a generated code and backed-up value, or adjust an existing card's balance using credit/debit transactions. Creation can include backed-up recipient notification settings. GiftCard writes are not supported for sync. |
| Store credit | Restore can issue credit/debit transactions to reconcile backed-up balances; recorded credit batches retain their supported expiration dates. Expired batches are not reissued and are reported. Sync keeps the target's store-credit balances. |
| Existing-order transactions | A sync configured for MERGE or UPDATE can add selected missing transactions. SALE is recorded as a manual payment. CAPTURE collects funds from an existing open authorization on the target order; VOID cancels that authorization. Amount, currency, authorization state and the execution plan constrain what can be sent. |
| Re-created orders and refund records | New order transaction records and imported refund transaction records are sent with manual gateways. Distinguish those records from the existing-order sync CAPTURE/VOID path. |

Restore and sync outcomes follow Shopify's supported writes and refusals; report partial failures.
Cancelling retains changes already applied. Do not promise automatic rollback or a target recovery backup.

Shopify Admin API 2026-10 references: [payment capture](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/orderCapture),
[authorization void](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/transactionVoid),
[manual payment recording](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/orderCreateManualPayment),
[gift-card creation](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/giftCardCreate),
[gift-card credit](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/giftCardCredit),
[gift-card debit](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/giftCardDebit),
[store-credit credit](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/storeCreditAccountCredit),
and [store-credit debit](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/storeCreditAccountDebit).
