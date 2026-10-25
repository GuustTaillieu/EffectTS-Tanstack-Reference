import { Context, Layer } from "effect"
import { db, AppDatabase } from "./connection"

export class DatabaseService extends Context.Service<
  DatabaseService,
  {
    readonly db: AppDatabase
  }
>()("DatabaseService") {}

export const DatabaseServiceLive = Layer.succeed(DatabaseService, {
  db
})
