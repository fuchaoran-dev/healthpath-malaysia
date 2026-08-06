// The same command supports both local offline development and cloud PostgreSQL deployment.
// A DATABASE_URL switches the server to PostgreSQL; without it the original SQLite server remains available.
if (process.env.DATABASE_URL) {
  await import("./server-postgres.mjs");
} else {
  await import("./server.js");
}
