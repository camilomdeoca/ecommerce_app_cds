#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/40bdbbb38158de4e603cddaeaa4db429d006eb501b7eafc061af9ebe06f74dbb/contract';
import endContract from '../../snapshots/40bdbbb38158de4e603cddaeaa4db429d006eb501b7eafc061af9ebe06f74dbb/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/be3244324d75b5fbf5a4ed455b12ba477b84698717741cf1190628d116b4d3ab/contract';
import startContract from '../../snapshots/be3244324d75b5fbf5a4ed455b12ba477b84698717741cf1190628d116b4d3ab/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'CartItem',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('productId', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'CartItem',
        constraint: 'CartItem_userId_productId_key',
        columns: ['userId', 'productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CartItem',
        index: 'CartItem_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CartItem',
        index: 'CartItem_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CartItem',
        foreignKey: {
          name: 'CartItem_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CartItem',
        foreignKey: {
          name: 'CartItem_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'Product', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
