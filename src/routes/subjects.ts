import { and, eq, getTableColumns, ilike, or, desc, sql } from 'drizzle-orm';
import express from 'express';
import { departments, subjects } from '../db/schema';
import { db } from '../db';

const router = express.Router();

// Get all subjects with optional search, filtering and pagination
router.get('/', async (req, res) => {
    try {
        const { search, department, page, limit } = req.query;

        const parseSingleString = (value: unknown): string | undefined => {
            const raw = Array.isArray(value) ? value[0] : value;
            if (typeof raw !== 'string') return undefined;
            const trimmed = raw.trim();
            return trimmed.length > 0 ? trimmed : undefined;
        };

        const parsePositiveInt = (value: unknown, fallback: number) => {
            const raw = Array.isArray(value) ? value[0] : value;
            const parsed = Number(raw);
            return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
        };

        const searchTerm = parseSingleString(search);
        const departmentTerm = parseSingleString(department);
        const currentPage = parsePositiveInt(page, 1);
        const limitPerPage = Math.min(parsePositiveInt(limit, 10), 100);

        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // If search query exists, filter by subject name OR subject code
        if (searchTerm) {
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${searchTerm}%`),
                    ilike(subjects.code, `%${searchTerm}%`)
                )
            );
        }

        // If department filter exists, match department name
        if (departmentTerm) {
            const deptPattern = `%${String(departmentTerm).replace(/[%_]/g, '\\$&')}%`;
            filterConditions.push(ilike(departments.name, deptPattern));
        }

        // Combine all filters using AND if any exist
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(subjects)
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        const subjectsList = await db
        .select({ 
            ...getTableColumns(subjects), 
            department: { ...getTableColumns(departments) } 
        })
        .from(subjects)
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(whereClause)
        .orderBy(desc(subjects.createdAt))
        .limit(limitPerPage)
        .offset(offset);

        res.status(200).json({
            data: subjectsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        })

    } catch (err) {
        console.error('GET /subjects error: ', err);
        res.status(500).json({ error: 'Failed to get subjects' });
    }

});

export default router;