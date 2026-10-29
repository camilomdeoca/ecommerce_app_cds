#!/usr/bin/env -S node
import type { Contract as Start } from "../../snapshots/40bdbbb38158de4e603cddaeaa4db429d006eb501b7eafc061af9ebe06f74dbb/contract";
import startContract from "../../snapshots/40bdbbb38158de4e603cddaeaa4db429d006eb501b7eafc061af9ebe06f74dbb/contract.json" with { type: "json" };
import type { Contract as End } from "../../snapshots/c2505d61448cbf451c44608c9d0cb7fa434ac47ffc3ade99f7c15bcf7ccb77da/contract";
import endContract from "../../snapshots/c2505d61448cbf451c44608c9d0cb7fa434ac47ffc3ade99f7c15bcf7ccb77da/contract.json" with { type: "json" };
import { Migration, MigrationCLI, col, lit } from "@prisma/orm-postgres/migration";

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: "public",
        table: "Product",
        column: col("active", "bool", {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: "pg/bool@1" },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
