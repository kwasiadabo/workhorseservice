const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config({
  path: path.resolve(__dirname, "..", "..", ".env"),
  quiet: true,
});

const boolFromString = (defaultValue) =>
  z
    .string()
    .optional()
    .transform((val) =>
      val === undefined ? defaultValue : val.toLowerCase() === "true",
    );

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(5000),
  APP_BASE_URL: z.string().default("http://localhost:5000"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),

  DB_DIALECT: z.string().default("mssql"),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_ENCRYPT: boolFromString(true),
  DB_TRUST_SERVER_CERTIFICATE: boolFromString(false),

  JWT_ACCESS_SECRET: z.string().default("dev_access_secret_change_me"),
  JWT_REFRESH_SECRET: z.string().default("dev_refresh_secret_change_me"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  BCRYPT_SALT_ROUNDS: z.coerce.number().default(10),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("VX-Workhorse <no-reply@example.com>"),

  UPLOAD_DIR: z.string().default("uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().default(5),

  SUPER_ADMIN_EMAIL: z.string().default("admin@platform.local"),
  SUPER_ADMIN_PASSWORD: z.string().default("ChangeMe123!"),

  PAYSTACK_SECRET_KEY: z.string().default(""),
  PAYSTACK_PUBLIC_KEY: z.string().default(""),

  NALO_API_KEY: z.string().default(""),
  NALO_SENDER_ID: z.string().default("WorkHorse"),
  NALO_API_URL: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Schema only has optional/defaulted fields, so this should not happen in
  // practice — but fail loudly if it ever does, since it indicates a bug in
  // the schema itself rather than a user configuration problem.
  console.error("Invalid environment configuration:", parsed.error.issues);
  throw new Error("Invalid environment configuration");
}

const env = parsed.data;

env.isDbConfigured = Boolean(
  env.DB_HOST && env.DB_NAME && env.DB_USER && env.DB_PASSWORD,
);

if (!env.isDbConfigured) {
  console.warn(
    "[config] Database connection is not fully configured (DB_HOST/DB_NAME/DB_USER/DB_PASSWORD). " +
      "Copy .env.example to backend/.env and fill in your SQL Server credentials. " +
      "The server will still start, but DB-dependent routes will fail.",
  );
}

if (env.NODE_ENV === "production") {
  if (
    env.JWT_ACCESS_SECRET === "dev_access_secret_change_me" ||
    env.JWT_REFRESH_SECRET === "dev_refresh_secret_change_me"
  ) {
    console.warn(
      "[config] Using default JWT secrets in production. Set JWT_ACCESS_SECRET / JWT_REFRESH_SECRET.",
    );
  }
  if (env.PAYSTACK_SECRET_KEY.startsWith("sk_test_")) {
    console.warn(
      "[config] Using Paystack test key in production. Set PAYSTACK_SECRET_KEY to a live key.",
    );
  }
}

module.exports = env;
