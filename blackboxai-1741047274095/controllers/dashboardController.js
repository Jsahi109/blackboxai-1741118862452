const MasterModel = require('../models/masterModel');
const DispositionModel = require('../models/dispositionModel');

exports.getDashboard = async (req, res) => {
    try {
        // Get record statistics
        const recordStats = await MasterModel.getRecordStats();
        
        // Get vendor statistics
        const vendorStats = await MasterModel.getVendorStats();
        
        // Get disposition statistics
        const dispositionStats = await DispositionModel.getDispositionStats();
        
        // Get disposition summary
        const dispositionSummary = await DispositionModel.getDispositionSummary();
        
        // Get vendor performance
        const vendorPerformance = await MasterModel.getVendorPerformance();
        
        // Get geographic distribution
        const geoDistribution = await MasterModel.getGeographicDistribution();
        
        // Get recent activity
        const recentUploads = await MasterModel.getRecentUploads(5);
        const recentDispositions = await DispositionModel.getRecentDispositions(5);

        // Combine and sort recent activity
        const recentActivity = [...recentUploads.map(upload => ({
            type: 'upload',
            description: `File "${upload.original_filename}" uploaded`,
            metadata: `${upload.successful_records} records processed`,
            timeFormatted: new Date(upload.upload_date).toLocaleTimeString(),
            dateFormatted: new Date(upload.upload_date).toLocaleDateString()
        })), ...recentDispositions.map(disp => ({
            type: 'disposition',
            description: `New disposition: ${disp.disposition_type}`,
            metadata: disp.notes ? `Note: ${disp.notes}` : null,
            timeFormatted: new Date(disp.created_at).toLocaleTimeString(),
            dateFormatted: new Date(disp.created_at).toLocaleDateString()
        }))].sort((a, b) => new Date(b.dateFormatted) - new Date(a.dateFormatted));

        // Calculate growth rates and percentages
        const recordsGrowth = recordStats.previousCount > 0 
            ? ((recordStats.count - recordStats.previousCount) / recordStats.previousCount * 100).toFixed(1)
            : 0;

        const dispositionsGrowth = dispositionStats.yesterdayCount > 0
            ? ((dispositionStats.todayCount - dispositionStats.yesterdayCount) / dispositionStats.yesterdayCount * 100).toFixed(1)
            : 0;

        // Prepare render data
        const renderData = {
            stats: {
                totalRecords: recordStats.count || 0,
                duplicateRate: recordStats.count > 0 
                    ? ((recordStats.duplicates / recordStats.count) * 100).toFixed(1)
                    : 0,
                activeVendors: vendorStats.activeCount || 0,
                dispositionsToday: dispositionStats.todayCount || 0,
                recordsGrowth,
                dispositionsGrowth,
                totalVendors: vendorStats.totalCount || 0,
                totalDuplicates: recordStats.duplicates || 0
            },
            recentActivity: recentActivity || [],
            dispositionSummary: dispositionSummary || [],
            vendorPerformance: vendorPerformance || [],
            geoDistribution: {
                labels: geoDistribution.labels || [],
                data: geoDistribution.data || []
            }
        };

        res.render('dashboard', renderData);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.render('error', {
            message: 'Error loading dashboard',
            error: error.message || 'An unexpected error occurred'
        });
    }
};

exports.getStats = async (req, res) => {
    try {
        const recordStats = await MasterModel.getRecordStats();
        const vendorStats = await MasterModel.getVendorStats();
        const dispositionStats = await DispositionModel.getDispositionStats();

        res.json({
            totalRecords: recordStats.count || 0,
            duplicateRate: recordStats.count > 0 
                ? ((recordStats.duplicates / recordStats.count) * 100).toFixed(1)
                : 0,
            activeVendors: vendorStats.activeCount || 0,
            dispositionsToday: dispositionStats.todayCount || 0,
            recordsGrowth: recordStats.previousCount > 0 
                ? (((recordStats.count - recordStats.previousCount) / recordStats.previousCount) * 100).toFixed(1)
                : 0,
            totalVendors: vendorStats.totalCount || 0,
            totalDuplicates: recordStats.duplicates || 0
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: error.message || 'Error getting stats' });
    }
};

exports.getGeographicDistribution = async (req, res) => {
    try {
        const data = await MasterModel.getGeographicDistribution();
        res.json(data);
    } catch (error) {
        console.error('Error getting geographic distribution:', error);
        res.status(500).json({ error: error.message || 'Error getting geographic distribution' });
    }
};

exports.getVendorPerformance = async (req, res) => {
    try {
        const data = await MasterModel.getVendorPerformance();
        res.json(data);
    } catch (error) {
        console.error('Error getting vendor performance:', error);
        res.status(500).json({ error: error.message || 'Error getting vendor performance' });
    }
};

exports.getRecentActivity = async (req, res) => {
    try {
        const period = req.query.period || 'week';
        const recentUploads = await MasterModel.getRecentUploads(5);
        const recentDispositions = await DispositionModel.getRecentDispositions(5);

        const recentActivity = [...recentUploads.map(upload => ({
            type: 'upload',
            description: `File "${upload.original_filename}" uploaded`,
            metadata: `${upload.successful_records} records processed`,
            timeFormatted: new Date(upload.upload_date).toLocaleTimeString(),
            dateFormatted: new Date(upload.upload_date).toLocaleDateString()
        })), ...recentDispositions.map(disp => ({
            type: 'disposition',
            description: `New disposition: ${disp.disposition_type}`,
            metadata: disp.notes ? `Note: ${disp.notes}` : null,
            timeFormatted: new Date(disp.created_at).toLocaleTimeString(),
            dateFormatted: new Date(disp.created_at).toLocaleDateString()
        }))].sort((a, b) => new Date(b.dateFormatted) - new Date(a.dateFormatted));

        res.json(recentActivity);
    } catch (error) {
        console.error('Error getting recent activity:', error);
        res.status(500).json({ error: error.message || 'Error getting recent activity' });
    }
};
