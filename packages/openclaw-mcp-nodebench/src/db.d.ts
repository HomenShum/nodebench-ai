import Database from "better-sqlite3";
export declare function getDb(): Database.Database;
export declare function genId(prefix: string): string;
export declare function seedGotchasIfEmpty(gotchas: Array<{
    key: string;
    content: string;
    category: string;
    severity: string;
    tags: string;
}>): void;
