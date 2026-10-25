#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/65efd3396023af32235a1a1ed9dea21147b269c5e1a77c4581057de3f57aaec5/contract';
import startContract from '../../snapshots/65efd3396023af32235a1a1ed9dea21147b269c5e1a77c4581057de3f57aaec5/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/df71a7a600b10a406e35979f0a71bbddef246fa4e0a9b43aecdb1044eb18940a/contract';
import endContract from '../../snapshots/df71a7a600b10a406e35979f0a71bbddef246fa4e0a9b43aecdb1044eb18940a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('role', 'text', {
          notNull: true,
          default: lit('customer'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_role_check_b66bc0f0',
        expression: sql`"role" IN ('customer', 'admin')`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
