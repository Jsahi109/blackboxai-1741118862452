const multer = require('multer');
const path = require('path');
const csv = require('csv-parser');
const fs = require('fs');
const MasterModel = require('../models/masterModel');

// Configure multer for file upload
// Configure multer for file upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || 'uploads/';
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, `${uniqueSuffix}-${safeFilename}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'text/csv').split(',');
    if (allowedTypes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.csv')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only CSV files are allowed.'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || 10485760), // Default 10MB
        files: 1
    }
}).single('file');

exports.getUploadForm = (req, res) => {
    res.render('upload', {
        layout: 'layouts/main',
        error: null
    });
};

exports.uploadFile = async (req, res, next) => {
    try {
        // Wrap multer upload in a promise
        await new Promise((resolve, reject) => {
            upload(req, res, (err) => {
                if (err) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        reject(new Error(`File size exceeds limit of ${process.env.MAX_FILE_SIZE / 1024 / 1024}MB`));
                    } else {
                        reject(err);
                    }
                }
                resolve();
            });
        });

        if (!req.file) {
            throw new Error('Please select a file to upload');
        }

        // Validate vendor name
        if (!req.body.vendor || req.body.vendor.trim().length === 0) {
            throw new Error('Vendor name is required');
        }

        // Create upload record
        const uploadRecord = await MasterModel.createUploadRecord({
            filename: req.file.filename,
            original_filename: req.file.originalname,
            vendor_name: req.body.vendor.trim(),
            file_size: req.file.size,
            file_path: req.file.path,
            uploaded_by: req.body.user || 'system'
        });

            // Read CSV headers with proper error handling
            const csvHeaders = await new Promise((resolve, reject) => {
                const headers = [];
                const stream = fs.createReadStream(req.file.path)
                    .pipe(csv())
                    .on('headers', (csvHeaders) => {
                        headers.push(...csvHeaders);
                    })
                    .on('error', (error) => {
                        reject(error);
                    })
                    .on('end', () => {
                        if (headers.length === 0) {
                            reject(new Error('No headers found in CSV file'));
                        } else {
                            resolve(headers);
                        }
                    });

                // Handle stream errors
                stream.on('error', reject);
            });

            // Update upload record with headers
            await MasterModel.updateUploadRecord(uploadRecord.id, {
                headers: csvHeaders,
                status: 'processing'
            });

            res.redirect(`/upload/map?id=${uploadRecord.id}`);
    } catch (error) {
        // Clean up uploaded file if there's an error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting uploaded file:', unlinkError);
            }
        }

        // Pass error to error handling middleware
        next(error);
    }
};

exports.getMapFields = async (req, res) => {
    try {
        const uploadId = req.query.id;
        const upload = await MasterModel.getUploadById(uploadId);
        
        if (!upload) {
            return res.render('error', {
                layout: 'layouts/main',
                message: 'Upload not found',
                error: 'The requested upload record does not exist'
            });
        }

        const columnNames = await MasterModel.getColumnNames();
        const sampleData = {};

        // Get sample data from first row
        await new Promise((resolve, reject) => {
            let firstRow = true;
            fs.createReadStream(upload.file_path)
                .pipe(csv())
                .on('data', (row) => {
                    if (firstRow) {
                        Object.keys(row).forEach(header => {
                            sampleData[header] = row[header];
                        });
                        firstRow = false;
                        resolve();
                    }
                })
                .on('error', reject);
        });

        res.render('mapFields', {
            layout: 'layouts/main',
            fileId: uploadId,
            vendorName: upload.vendor_name,
            originalFilename: upload.original_filename,
            totalRows: 0, // This will be calculated during processing
            csvHeaders: upload.headers,
            columnNames,
            sampleData,
            error: null
        });
    } catch (error) {
        console.error('Error loading map fields form:', error);
        res.render('error', {
            layout: 'layouts/main',
            message: 'Error loading field mapping',
            error: error.message
        });
    }
};

exports.processMapping = async (req, res) => {
    const { fileId, mapping } = req.body;
    let totalRows = 0;
    let successfulRows = 0;
    let duplicateRows = 0;
    let failedRows = 0;

    try {
        const upload = await MasterModel.getUploadById(fileId);
        if (!upload) {
            throw new Error('Upload record not found');
        }

        // Update upload record with mapping
        await MasterModel.updateUploadRecord(fileId, {
            mapping: mapping,
            status: 'processing'
        });

        // Process CSV file
        const records = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream(upload.file_path)
                .pipe(csv())
                .on('data', (row) => {
                    totalRows++;
                    const mappedRecord = {};
                    Object.entries(mapping).forEach(([csvField, dbField]) => {
                        if (dbField) {
                            mappedRecord[dbField] = row[csvField];
                        }
                    });
                    records.push(mappedRecord);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        // Process records in batches
        const batchSize = 1000;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            
            // Check for duplicates
            const phoneNumbers = batch
                .map(r => r.phone1)
                .filter(Boolean);
            
            const duplicates = await MasterModel.checkDuplicatePhones(phoneNumbers);
            
            // Process each record
            for (const record of batch) {
                try {
                    if (!record.phone1) {
                        failedRows++;
                        continue;
                    }

                    if (duplicates.includes(record.phone1)) {
                        duplicateRows++;
                        continue;
                    }

                    await MasterModel.insertMasterRecord(record, upload.vendor_name);
                    successfulRows++;
                } catch (error) {
                    console.error('Error inserting record:', error);
                    failedRows++;
                }
            }

            // Update progress
            await MasterModel.updateUploadRecord(fileId, {
                total_records: totalRows,
                successful_records: successfulRows,
                duplicates_count: duplicateRows,
                failed_records: failedRows
            });
        }

        // Mark upload as completed
        await MasterModel.updateUploadRecord(fileId, {
            status: 'completed'
        });

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error processing mapping:', error);
        
        // Update upload record with error
        await MasterModel.updateUploadRecord(fileId, {
            status: 'failed',
            error_message: error.message
        });

        res.render('error', {
            layout: 'layouts/main',
            message: 'Error processing file',
            error: error.message
        });
    }
};
