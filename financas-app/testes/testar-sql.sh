#!/bin/sh
# Testa o esquema.sql num Postgres (o do computador ou o do GitHub): roda 2 vezes e confere as regras de segurança.
# Precisa de PGHOST/PGPORT/PGUSER apontando para um Postgres onde dá para criar banco.
set -e
cd "$(dirname "$0")"
psql -q -c "drop database if exists teste_darzan" -c "create database teste_darzan"
export PGDATABASE=teste_darzan
psql -q -v ON_ERROR_STOP=1 -f sql/supabase-local.sql
psql -q -v ON_ERROR_STOP=1 -f ../supabase/esquema.sql > /dev/null 2>&1
psql -q -v ON_ERROR_STOP=1 -f ../supabase/esquema.sql > /dev/null 2>&1 || { echo "FALHOU: rodar o esquema 2 vezes"; exit 1; }
psql -q -At -v ON_ERROR_STOP=1 -f sql/testar-rls.sql
