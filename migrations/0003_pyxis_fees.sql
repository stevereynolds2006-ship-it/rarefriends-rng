alter table pyxis_draws
  add column if not exists fee_units bigint not null default 0;
