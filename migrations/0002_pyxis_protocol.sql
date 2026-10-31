create table if not exists pyxis_provider (
  id smallint primary key,
  seed_hex text not null,
  root_hex text not null,
  chain_length integer not null,
  sequence integer not null default 0,
  created_at_ms bigint not null,
  constraint pyxis_provider_singleton check (id = 1)
);

create table if not exists pyxis_draws (
  sequence integer primary key,
  domain text not null,
  consumer text not null,
  user_random text not null,
  commitment_before text not null,
  provider_reveal text not null,
  random_number text not null,
  requested_at_ms bigint not null,
  latency_ms integer not null
);
