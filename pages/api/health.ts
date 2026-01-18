
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Attempt simple query
        const count = await prisma.user.count();

        // Check environment variable (safely)
        const dbUrl = process.env.DATABASE_URL;
        const isDbUrlSet = !!dbUrl;
        const dbUrlPrefix = dbUrl ? dbUrl.split(':')[0] : 'not-set';

        return res.status(200).json({
            status: 'ok',
            database_connected: true,
            user_count: count,
            env: {
                has_database_url: isDbUrlSet,
                database_provider: dbUrlPrefix
            },
            message: 'Database connection successful'
        });
    } catch (error: any) {
        console.error('Health Check Error:', error);
        return res.status(500).json({
            status: 'error',
            database_connected: false,
            error: error.message,
            code: error.code,
            env: {
                has_database_url: !!process.env.DATABASE_URL
            }
        });
    }
}
