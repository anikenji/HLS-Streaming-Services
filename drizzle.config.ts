import type { Config } from 'drizzle-kit';

export default {
    schema: './src/lib/db/schema.ts',
    out: './drizzle',
    dialect: 'sqlite',
    dbCredentials: {
        url: './data/streaming.db',
    },
} satisfies Config;
