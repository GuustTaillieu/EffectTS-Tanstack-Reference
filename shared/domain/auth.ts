import { Schema } from "effect"

export class AuthUser extends Schema.Class<AuthUser>("AuthUser")({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  image: Schema.NullOr(Schema.String),
  emailVerified: Schema.Boolean,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
  isAnonymous: Schema.NullOr(Schema.Boolean)
}) {}

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  "UnauthorizedError",
  {
    message: Schema.String
  }
) {}
