/**
 * Script to run the events/tasks to documents migration.
 * 
 * Usage:
 *   npx convex run migrations/migrateEventsTasksToDocuments:migrateAll --prod
 * 
 * Or for dev:
 *   npx convex run migrations/migrateEventsTasksToDocuments:migrateAll
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  Events & Tasks → Documents Migration                         ║
║                                                                ║
║  This will convert all existing events and tasks to documents  ║
║  with appropriate tags and metadata.                           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Run the following command to execute the migration:

  npx convex run migrations/migrateEventsTasksToDocuments:migrateAll

Or for production:

  npx convex run migrations/migrateEventsTasksToDocuments:migrateAll --prod

`);

