const db = require('../config/db');

class DispositionModel {
    static async getDispositionStats() {
        try {
            const connection = await db.getDb();

            // Get today's dispositions count
            const todayCount = await connection.get(
                `SELECT COUNT(*) as count
                FROM dispositions
                WHERE date(created_at) = date('now')`
            );

            // Get yesterday's dispositions count
            const yesterdayCount = await connection.get(
                `SELECT COUNT(*) as count
                FROM dispositions
                WHERE date(created_at) = date('now', '-1 day')`
            );

            return {
                todayCount: todayCount?.count || 0,
                yesterdayCount: yesterdayCount?.count || 0,
                growth: yesterdayCount?.count > 0 
                    ? (((todayCount?.count - yesterdayCount?.count) / yesterdayCount?.count) * 100).toFixed(1)
                    : 0
            };
        } catch (error) {
            console.error('Error getting disposition stats:', error);
            throw error;
        }
    }

    static async getDispositionSummary() {
        try {
            const connection = await db.getDb();

            const results = await connection.all(
                `SELECT 
                    dt.name,
                    COUNT(d.id) as count
                FROM disposition_types dt
                LEFT JOIN dispositions d ON dt.name = d.disposition_type
                WHERE dt.is_active = 1
                GROUP BY dt.name
                ORDER BY count DESC`
            );

            const total = results.reduce((sum, row) => sum + row.count, 0);
            const colors = [
                '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
                '#858796', '#5a5c69', '#2e59d9', '#17a673', '#2c9faf'
            ];

            return results.map((row, index) => ({
                name: row.name,
                count: row.count,
                percentage: total > 0 ? ((row.count / total) * 100).toFixed(1) : 0,
                color: colors[index % colors.length]
            }));
        } catch (error) {
            console.error('Error getting disposition summary:', error);
            throw error;
        }
    }

    static async getRecentDispositions(limit = 5) {
        try {
            const connection = await db.getDb();

            return await connection.all(
                `SELECT 
                    d.*,
                    m.first_name,
                    m.last_name,
                    m.email
                FROM dispositions d
                LEFT JOIN master m ON d.phone_number = m.phone1
                ORDER BY d.created_at DESC
                LIMIT ?`,
                [limit]
            );
        } catch (error) {
            console.error('Error getting recent dispositions:', error);
            throw error;
        }
    }

    static async createDisposition(data) {
        try {
            const connection = await db.getDb();

            const result = await connection.run(
                `INSERT INTO dispositions (
                    phone_number,
                    disposition_type,
                    notes,
                    created_by
                ) VALUES (?, ?, ?, ?)`,
                [data.phone_number, data.disposition_type, data.notes, data.created_by]
            );

            return { id: result.lastID };
        } catch (error) {
            console.error('Error creating disposition:', error);
            throw error;
        }
    }

    static async updateDisposition(id, data) {
        try {
            const connection = await db.getDb();

            const result = await connection.run(
                `UPDATE dispositions 
                SET disposition_type = ?,
                    notes = ?,
                    updated_at = datetime('now')
                WHERE id = ?`,
                [data.disposition_type, data.notes, id]
            );

            return result.changes > 0;
        } catch (error) {
            console.error('Error updating disposition:', error);
            throw error;
        }
    }

    static async getDispositionById(id) {
        try {
            const connection = await db.getDb();

            return await connection.get(
                'SELECT * FROM dispositions WHERE id = ?',
                [id]
            );
        } catch (error) {
            console.error('Error getting disposition by id:', error);
            throw error;
        }
    }

    static async getDispositionsByPhone(phone_number) {
        try {
            const connection = await db.getDb();

            return await connection.all(
                'SELECT * FROM dispositions WHERE phone_number = ? ORDER BY created_at DESC',
                [phone_number]
            );
        } catch (error) {
            console.error('Error getting dispositions by phone:', error);
            throw error;
        }
    }

    static async getDispositionTypes() {
        try {
            const connection = await db.getDb();

            return await connection.all(
                'SELECT * FROM disposition_types WHERE is_active = 1 ORDER BY name'
            );
        } catch (error) {
            console.error('Error getting disposition types:', error);
            throw error;
        }
    }
}

module.exports = DispositionModel;
