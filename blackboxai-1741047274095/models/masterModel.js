const db = require('../config/db');

class MasterModel {
    static async getRecordStats() {
        try {
            const connection = await db.getDb();
            
            // Get current count
            const currentCount = await connection.get(
                'SELECT COUNT(*) as count FROM master'
            );

            // Get count from previous month
            const previousCount = await connection.get(
                `SELECT COUNT(*) as count FROM master 
                WHERE created_at < date('now', 'start of month')`
            );

            // Get duplicates count
            const duplicates = await connection.get(
                `SELECT COUNT(*) as count FROM master 
                WHERE phone1 IN (
                    SELECT phone1 FROM master GROUP BY phone1 HAVING COUNT(*) > 1
                )`
            );

            return {
                count: currentCount?.count || 0,
                previousCount: previousCount?.count || 0,
                duplicates: duplicates?.count || 0
            };
        } catch (error) {
            console.error('Error getting record stats:', error);
            throw error;
        }
    }

    static async getVendorStats() {
        try {
            const connection = await db.getDb();
            
            // Get total vendors
            const totalCount = await connection.get(
                'SELECT COUNT(DISTINCT vendor_name) as count FROM master'
            );

            // Get active vendors (those with records in the last 30 days)
            const activeCount = await connection.get(
                `SELECT COUNT(DISTINCT vendor_name) as count FROM master 
                WHERE created_at >= datetime('now', '-30 days')`
            );

            return {
                totalCount: totalCount?.count || 0,
                activeCount: activeCount?.count || 0
            };
        } catch (error) {
            console.error('Error getting vendor stats:', error);
            throw error;
        }
    }

    static async getVendorPerformance() {
        try {
            const connection = await db.getDb();
            
            // Get vendor performance metrics
            const vendors = await connection.all(
                `SELECT 
                    vendor_name,
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN d.disposition_type = 'Completed' THEN 1 END) as successful_calls
                FROM master m
                LEFT JOIN dispositions d ON m.phone1 = d.phone_number
                GROUP BY vendor_name
                ORDER BY total_records DESC
                LIMIT 5`
            );

            return vendors.map(vendor => ({
                name: vendor.vendor_name,
                successRate: vendor.total_records > 0 
                    ? ((vendor.successful_calls / vendor.total_records) * 100).toFixed(1)
                    : 0,
                trend: Math.random() < 0.5 ? 'up' : 'down', // Simulated trend
                change: (Math.random() * 10).toFixed(1) // Simulated change percentage
            }));
        } catch (error) {
            console.error('Error getting vendor performance:', error);
            throw error;
        }
    }

    static async getGeographicDistribution() {
        try {
            const connection = await db.getDb();
            
            const regions = await connection.all(
                `SELECT 
                    region,
                    COUNT(*) as count
                FROM master
                WHERE region IS NOT NULL
                GROUP BY region
                ORDER BY count DESC`
            );

            return {
                labels: regions.map(r => r.region),
                data: regions.map(r => r.count)
            };
        } catch (error) {
            console.error('Error getting geographic distribution:', error);
            throw error;
        }
    }

    static async getRecentUploads(limit = 5) {
        try {
            const connection = await db.getDb();
            
            return await connection.all(
                `SELECT * FROM uploaded_files 
                ORDER BY upload_date DESC 
                LIMIT ?`,
                [limit]
            );
        } catch (error) {
            console.error('Error getting recent uploads:', error);
            throw error;
        }
    }

    static async searchRecords(query) {
        try {
            const connection = await db.getDb();
            
            return await connection.all(
                `SELECT * FROM master 
                WHERE first_name LIKE ? 
                OR last_name LIKE ? 
                OR email LIKE ? 
                OR phone1 LIKE ?
                LIMIT 100`,
                [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
            );
        } catch (error) {
            console.error('Error searching records:', error);
            throw error;
        }
    }

    static async addRecord(data) {
        try {
            const connection = await db.getDb();
            
            const result = await connection.run(
                `INSERT INTO master (
                    first_name, last_name, email, phone1, phone2, phone3, phone4,
                    address1, address2, city, state, county, region, zipcode,
                    lat, lon, vendor_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.first_name, data.last_name, data.email, data.phone1,
                    data.phone2, data.phone3, data.phone4, data.address1,
                    data.address2, data.city, data.state, data.county,
                    data.region, data.zipcode, data.lat, data.lon, data.vendor_name
                ]
            );

            return { id: result.lastID };
        } catch (error) {
            console.error('Error adding record:', error);
            throw error;
        }
    }
}

module.exports = MasterModel;
