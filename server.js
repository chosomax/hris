const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const util = require('util');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files

// MySQL connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Zandergo19!!..',
    database: process.env.DB_NAME || 'hris_payroll_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

if (!dbConfig.password) {
    console.error('ERROR: DB_PASSWORD environment variable is not set. Please configure it before running.');
    process.exit(1);
}

const positionBaseRates = {
    'Software Engineer': 45000.00,
    'HR Manager': 38000.00,
    'Accountant': 32000.00,
    'Sales Associate': 25000.00,
    'Customer Support': 22000.00,
    'Intern': 12000.00
};

let dbPool = mysql.createPool(dbConfig);

dbPool.on('error', (err) => {
    console.error('Unexpected error on idle connection:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('Database connection was closed.');
    }
    if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
        console.error('Fatal error in database connection.');
    }
    if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
        console.error('Too many connections.');
    }
});

// Wrapper function to execute queries safely
function executeQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        dbPool.query(query, params, (err, results) => {
            if (err) {
                console.error('Query error:', err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

console.log('Database pool initialized');

// Note: Table creation is disabled. Ensure tables exist in your database before running this app.
// Expected tables: departments, positions, employees, attendance, payroll, allowances, deductions

// Routes
app.get('/api/employees', (req, res) => {
    console.log('GET /api/employees called');
    const query = `
        SELECT
            e.emp_id AS id,
            CONCAT(e.first_name, ' ', e.last_name) AS name,
            IFNULL(p.position_name, 'Unknown') AS position,
            IFNULL(d.dept_name, 'Unknown') AS department,
            IFNULL(e.basic_salary, 0.00) AS basic_salary
        FROM employees e
        LEFT JOIN positions p ON e.position_id = p.position_id
        LEFT JOIN departments d ON e.dept_id = d.dept_id
        ORDER BY e.emp_id
    `;
    dbPool.query(query, (err, results) => {
        if (err) {
            console.error('Employees fetch error:', err);
            return res.status(500).json({ error: 'Failed to fetch employees', details: err.message });
        }
        console.log('Employees fetched:', results.length);
        res.json(results);
    });
});

// Get list of departments
app.get('/api/departments', (req, res) => {
    const query = 'SELECT dept_id as id, dept_name as name FROM departments ORDER BY dept_name';
    dbPool.query(query, (err, results) => {
        if (err) {
            console.error('Departments fetch error:', err);
            return res.status(500).json({ error: 'Failed to fetch departments', details: err.message });
        }
        res.json(results);
    });
});

// Get list of positions
app.get('/api/positions', (req, res) => {
    const query = 'SELECT position_id as id, position_name as name FROM positions ORDER BY position_name';
    dbPool.query(query, (err, results) => {
        if (err) {
            console.error('Positions fetch error:', err);
            return res.status(500).json({ error: 'Failed to fetch positions', details: err.message });
        }
        res.json(results);
    });
});

function findOrCreateDepartment(deptName, callback) {
    dbPool.query('SELECT dept_id FROM departments WHERE dept_name = ?', [deptName], (err, results) => {
        if (err) return callback(err);
        if (results.length > 0) return callback(null, results[0].dept_id);
        dbPool.query('INSERT INTO departments (dept_name) VALUES (?)', [deptName], (err, result) => {
            if (err) return callback(err);
            callback(null, result.insertId);
        });
    });
}

function findOrCreatePosition(positionName, callback) {
    const baseRate = positionBaseRates[positionName] || 0.00;
    dbPool.query('SELECT position_id FROM positions WHERE position_name = ?', [positionName], (err, results) => {
        if (err) return callback(err);
        if (results.length > 0) return callback(null, results[0].position_id);
        dbPool.query('INSERT INTO positions (position_name, base_rate) VALUES (?, ?)', [positionName, baseRate], (err, result) => {
            if (err) return callback(err);
            callback(null, result.insertId);
        });
    });
}

app.post('/api/employees', (req, res) => {
    console.log('POST /api/employees called with:', req.body);
    const {
        first_name,
        last_name,
        email = null,
        phone = null,
        department,
        position,
        basic_salary = 0.00,
        hire_date,
        status = 'ACTIVE'
    } = req.body;

    if (!first_name || !last_name || !department || !position || !hire_date) {
        return res.status(400).json({ error: 'Missing required employee fields' });
    }

    const salary = Number(basic_salary) > 0 ? Number(basic_salary) : (positionBaseRates[position] || 0.00);

    findOrCreateDepartment(department, (err, dept_id) => {
        if (err) {
            console.error('Department lookup error:', err);
            return res.status(500).json({ error: 'Department lookup failed', details: err.message });
        }
        findOrCreatePosition(position, (err, position_id) => {
            if (err) {
                console.error('Position lookup error:', err);
                return res.status(500).json({ error: 'Position lookup failed', details: err.message });
            }
            dbPool.query(
                'INSERT INTO employees (first_name, last_name, email, phone, dept_id, position_id, basic_salary, hire_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [first_name, last_name, email, phone, dept_id, position_id, salary, hire_date, status],
                (err, result) => {
                    if (err) {
                        console.error('Employee insert error:', err);
                        return res.status(500).json({ error: 'Employee insert failed', details: err.message });
                    }
                    console.log('Employee inserted:', result.insertId);
                    res.json({ id: result.insertId, first_name, last_name, email, phone, department, position, basic_salary: salary, hire_date, status });
                }
            );
        });
    });
});

app.delete('/api/employees/:id', (req, res) => {
    const { id } = req.params;
    dbPool.query('DELETE FROM employees WHERE emp_id = ?', [id], (err) => {
        if (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).json({ error: 'Cannot delete employee with existing attendance records. Delete attendance records first.' });
            }
            console.error('Employee delete error:', err);
            return res.status(500).json({ error: 'Employee delete failed', details: err.message });
        }
        res.json({ message: 'Employee deleted' });
    });
});

app.get('/api/attendance', (req, res) => {
    console.log('GET /api/attendance called with filters:', req.query);
    
    let query = `
        SELECT
            a.attendance_id AS id,
            a.emp_id,
            CONCAT(e.first_name, ' ', e.last_name) AS employee,
            a.work_date,
            a.time_in,
            a.time_out,
            a.status,
            a.overtime_hours
        FROM attendance a
        LEFT JOIN employees e ON a.emp_id = e.emp_id
    `;
    
    const filters = [];
    const params = [];
    
    if (req.query.emp_id) {
        filters.push('a.emp_id = ?');
        params.push(req.query.emp_id);
    }
    
    if (req.query.date_from) {
        filters.push('a.work_date >= ?');
        params.push(req.query.date_from);
    }
    
    if (req.query.date_to) {
        filters.push('a.work_date <= ?');
        params.push(req.query.date_to);
    }
    
    if (filters.length > 0) {
        query += ' WHERE ' + filters.join(' AND ');
    }
    
    query += ' ORDER BY a.work_date DESC, a.attendance_id DESC';
    
    dbPool.query(query, params, (err, results) => {
        if (err) {
            console.error('Attendance query error:', err);
            return res.status(500).json({ error: 'Failed to fetch attendance records', details: err.message });
        }
        res.json(results);
    });
});

app.post('/api/attendance', (req, res) => {
    console.log('POST /api/attendance called with:', req.body);
    const { emp_id, work_date, time_in, time_out, status, overtime_hours } = req.body;
    dbPool.query(
        'INSERT INTO attendance (emp_id, work_date, time_in, time_out, status, overtime_hours) VALUES (?, ?, ?, ?, ?, ?)',
        [emp_id, work_date, time_in, time_out, status, overtime_hours],
        (err, result) => {
            if (err) {
                console.error('Attendance insert error:', err);
                return res.status(500).json({ error: 'Failed to insert attendance record', details: err.message });
            }
            console.log('Attendance inserted:', result.insertId);
            res.json({ id: result.insertId, emp_id, work_date, time_in, time_out, status, overtime_hours });
        }
    );
});

app.delete('/api/attendance/:id', (req, res) => {
    console.log('DELETE /api/attendance called for id:', req.params.id);
    const { id } = req.params;
    dbPool.query('DELETE FROM attendance WHERE attendance_id = ?', [id], (err) => {
        if (err) {
            console.error('Attendance delete error:', err);
            return res.status(500).json({ error: 'Failed to delete attendance record', details: err.message });
        }
        res.json({ message: 'Attendance record deleted' });
    });
});


// Payroll Routes
// ============================================================
// BIR 2023 Progressive Tax Table (monthly)
// ============================================================
function calculateBIR(monthlySalary) {
    if (monthlySalary <= 20833) return 0;
    if (monthlySalary <= 33332) return (monthlySalary - 20833) * 0.20;
    if (monthlySalary <= 66666) return 2500 + (monthlySalary - 33333) * 0.25;
    if (monthlySalary <= 166666) return 10833 + (monthlySalary - 66667) * 0.30;
    if (monthlySalary <= 666666) return 40833.33 + (monthlySalary - 166667) * 0.32;
    return 200833.33 + (monthlySalary - 666667) * 0.35;
}

// ============================================================
// Government deductions — all halved for semi-monthly payroll
// ============================================================
function calculateGovernmentDeductions(monthlySalary) {
    // SSS: 4.5% employee share, max MSC 30000
    const msc = Math.min(Math.max(monthlySalary, 3250), 30000);
    const sss = parseFloat((msc * 0.045 / 2).toFixed(2));

    // PhilHealth: 2% employee share, max ₱1800/month
    const philhealth = parseFloat((Math.min(monthlySalary * 0.02, 1800) / 2).toFixed(2));

    // Pag-IBIG: fixed ₱100/month → ₱50 semi-monthly
    const pagibig = 50.00;

    // BIR: full monthly computed, halved for semi-monthly period
    const bir = parseFloat((calculateBIR(monthlySalary) / 2).toFixed(2));

    return { sss, philhealth, pagibig, bir };
}

// ============================================================
// GET /api/payroll — fetch all payroll records
// ============================================================
app.get('/api/payroll', (req, res) => {
    console.log('GET /api/payroll called');
    const query = `
        SELECT
            p.payroll_id AS id,
            p.emp_id,
            CONCAT(e.first_name, ' ', e.last_name) AS employee,
            p.period_start,
            p.period_end,
            p.basic_salary,
            p.gross_pay,
            p.total_deductions,
            p.net_pay,
            p.status,
            p.payment_date
        FROM payroll p
        LEFT JOIN employees e ON p.emp_id = e.emp_id
        ORDER BY p.period_end DESC, p.emp_id ASC
    `;
    dbPool.query(query, (err, results) => {
        if (err) {
            console.error('Payroll fetch error:', err);
            return res.status(500).json({ error: 'Failed to fetch payroll records', details: err.message });
        }
        res.json(results);
    });
});

// ============================================================
// POST /api/payroll/generate — generate payroll from attendance
// ============================================================
app.post('/api/payroll/generate', async (req, res) => {
    console.log('POST /api/payroll/generate called with:', req.body);
    const { period_start, period_end } = req.body;

    if (!period_start || !period_end) {
        return res.status(400).json({ error: 'period_start and period_end are required' });
    }

    try {
        // 1. Get all active employees
        const employees = await executeQuery(
            'SELECT emp_id, first_name, last_name, basic_salary FROM employees WHERE status = ?',
            ['ACTIVE']
        );

        if (!employees.length) {
            return res.json({ message: 'No active employees found', results: [] });
        }

        const results = [];

        for (const emp of employees) {
            // 2. Skip if payroll already exists for this employee + period
            const existing = await executeQuery(
                'SELECT payroll_id FROM payroll WHERE emp_id = ? AND period_start = ? AND period_end = ?',
                [emp.emp_id, period_start, period_end]
            );

            if (existing.length > 0) {
                results.push({ emp_id: emp.emp_id, name: `${emp.first_name} ${emp.last_name}`, status: 'skipped', reason: 'already generated' });
                continue;
            }

            // 3. Get attendance — fetch time_in for late minute calculation
            const attendanceRows = await executeQuery(
                `SELECT status, time_in, overtime_hours
                 FROM attendance
                 WHERE emp_id = ? AND work_date BETWEEN ? AND ?`,
                [emp.emp_id, period_start, period_end]
            );

            // 4. Compute attendance stats
            let absentDays = 0;
            let totalLateMinutes = 0;
            let totalOvertimeHours = 0;
            let workedDays = 0;

            const CUTOFF = { hour: 9, minute: 0 }; // 9:00 AM cutoff

            for (const row of attendanceRows) {
                if (row.status === 'ABSENT') {
                    absentDays++;
                } else {
                    workedDays++;
                    totalOvertimeHours += parseFloat(row.overtime_hours) || 0;

                    // Calculate actual minutes late from time_in
                    if (row.status === 'LATE' && row.time_in) {
                        const timeIn = new Date(row.time_in);
                        const cutoff = new Date(timeIn);
                        cutoff.setHours(CUTOFF.hour, CUTOFF.minute, 0, 0);
                        if (timeIn > cutoff) {
                            totalLateMinutes += Math.floor((timeIn - cutoff) / 60000);
                        }
                    }
                }
            }

            // 5. Calculate salary components
            const monthlySalary = parseFloat(emp.basic_salary);
            const periodSalary = parseFloat((monthlySalary / 2).toFixed(2)); // semi-monthly
            const dailyRate = monthlySalary / 26;
            const hourlyRate = dailyRate / 8;

            const absentDeduction = parseFloat((absentDays * dailyRate).toFixed(2));
            const lateDeduction = parseFloat(((totalLateMinutes * hourlyRate) / 60).toFixed(2));
            const overtimePay = parseFloat((totalOvertimeHours * hourlyRate * 1.25).toFixed(2));

            // 6. Government deductions (semi-monthly)
            const govDeductions = calculateGovernmentDeductions(monthlySalary);
            const totalGovDeductions = parseFloat(
                (govDeductions.sss + govDeductions.philhealth + govDeductions.pagibig + govDeductions.bir).toFixed(2)
            );

            // 7. Gross and net
            const grossPay = parseFloat((periodSalary - absentDeduction - lateDeduction + overtimePay).toFixed(2));
            const totalDeductions = parseFloat((totalGovDeductions + absentDeduction + lateDeduction).toFixed(2));
            const netPay = parseFloat((grossPay - totalGovDeductions).toFixed(2));
            const totalHours = parseFloat((workedDays * 8).toFixed(2));

            // 8. Insert payroll record
            const payrollInsert = await executeQuery(
                `INSERT INTO payroll 
                    (emp_id, period_start, period_end, total_hours, basic_salary, gross_pay, total_deductions, net_pay, status, payment_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [emp.emp_id, period_start, period_end, totalHours, periodSalary, grossPay, totalDeductions, netPay, 'PAID', period_end]
            );

            const payrollId = payrollInsert.insertId;

            // 9. Insert allowances (overtime only if > 0)
            if (overtimePay > 0) {
                await executeQuery(
                    'INSERT INTO allowances (payroll_id, allowance_type, description, amount) VALUES (?, ?, ?, ?)',
                    [payrollId, 'Overtime', 'Overtime Pay (1.25x)', overtimePay]
                );
            }

            // 10. Insert deductions (government + attendance-based)
            const deductionRows = [
                ['SSS', 'SSS Employee Contribution', govDeductions.sss],
                ['PhilHealth', 'PhilHealth Employee Premium', govDeductions.philhealth],
                ['Pag-IBIG', 'Pag-IBIG Employee Contribution', govDeductions.pagibig],
                ['Tax', 'BIR Withholding Tax', govDeductions.bir],
            ];

            if (absentDeduction > 0) {
                deductionRows.push(['Absent', `Absent Deduction (${absentDays} day${absentDays > 1 ? 's' : ''})`, absentDeduction]);
            }
            if (lateDeduction > 0) {
                deductionRows.push(['Late', `Late Deduction (${totalLateMinutes} min)`, lateDeduction]);
            }

            for (const [dtype, desc, amount] of deductionRows) {
                await executeQuery(
                    'INSERT INTO deductions (payroll_id, deduction_type, description, amount) VALUES (?, ?, ?, ?)',
                    [payrollId, dtype, desc, amount]
                );
            }

            results.push({
                emp_id: emp.emp_id,
                name: `${emp.first_name} ${emp.last_name}`,
                status: 'generated',
                payroll_id: payrollId,
                gross_pay: grossPay,
                net_pay: netPay
            });
        }

        const generated = results.filter(r => r.status === 'generated').length;
        const skipped = results.filter(r => r.status === 'skipped').length;
        const errors = results.filter(r => r.status === 'error').length;

        res.json({
            message: `Payroll complete — ${generated} generated, ${skipped} skipped, ${errors} errors`,
            results
        });

    } catch (err) {
        console.error('Payroll generate error:', err);
        res.status(500).json({ error: 'Payroll generation failed', details: err.message });
    }
});

// ============================================================
// GET /api/payroll/:id/slip — fetch individual payslip
// ============================================================
app.get('/api/payroll/:id/slip', (req, res) => {
    console.log('GET /api/payroll/:id/slip called for:', req.params.id);
    const { id } = req.params;

    dbPool.query(
        `SELECT
            p.payroll_id,
            p.emp_id,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            e.email,
            e.phone,
            IFNULL(d.dept_name, 'Unknown') AS department,
            IFNULL(pos.position_name, 'Unknown') AS position,
            p.basic_salary,
            p.period_start,
            p.period_end,
            p.total_hours,
            p.gross_pay,
            p.total_deductions,
            p.net_pay,
            p.status,
            p.payment_date
        FROM payroll p
        LEFT JOIN employees e ON p.emp_id = e.emp_id
        LEFT JOIN departments d ON e.dept_id = d.dept_id
        LEFT JOIN positions pos ON e.position_id = pos.position_id
        WHERE p.payroll_id = ?`,
        [id],
        (err, payroll) => {
            if (err) {
                console.error('Payslip fetch error:', err);
                return res.status(500).json({ error: 'Failed to fetch payslip', details: err.message });
            }
            if (!payroll.length) {
                return res.status(404).json({ error: 'Payroll record not found' });
            }

            const payrollRecord = payroll[0];

            dbPool.query('SELECT allowance_type AS type, description, amount FROM allowances WHERE payroll_id = ?', [id], (err, allowances) => {
                if (err) return res.status(500).json({ error: 'Failed to fetch allowances', details: err.message });

                dbPool.query('SELECT deduction_type AS type, description, amount FROM deductions WHERE payroll_id = ?', [id], (err, deductions) => {
                    if (err) return res.status(500).json({ error: 'Failed to fetch deductions', details: err.message });

                    res.json({
                        ...payrollRecord,
                        allowances: allowances || [],
                        deductions: deductions || []
                    });
                });
            });
        }
    );
});

app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
});