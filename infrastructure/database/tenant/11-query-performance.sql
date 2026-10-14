-- Supporting index for per-account transaction history and running balance queries.
create index if not exists ledger_entries_account_created_idx
  on ledger_entries(account_id, created_at desc, id desc);

create index if not exists ledger_entries_created_id_idx
  on ledger_entries(created_at desc, id desc);
