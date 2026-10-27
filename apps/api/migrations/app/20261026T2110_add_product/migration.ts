#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/be3244324d75b5fbf5a4ed455b12ba477b84698717741cf1190628d116b4d3ab/contract';
import endContract from '../../snapshots/be3244324d75b5fbf5a4ed455b12ba477b84698717741cf1190628d116b4d3ab/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/df71a7a600b10a406e35979f0a71bbddef246fa4e0a9b43aecdb1044eb18940a/contract';
import startContract from '../../snapshots/df71a7a600b10a406e35979f0a71bbddef246fa4e0a9b43aecdb1044eb18940a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Product',
        columns: [
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('priceCents', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
