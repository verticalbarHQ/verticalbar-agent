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
