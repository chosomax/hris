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
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'hris_payroll_db'
};

let dbConnection = mysql.createConnection(dbConfig);

dbConnection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to hris_payroll_db');

    // Create employees table if not exists
    dbConnection.query(`
        CREATE TABLE IF NOT EXISTS employees (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            position VARCHAR(255) NOT NULL,
            department VARCHAR(255) NOT NULL
        )
    `, (err) => {
        if (err) throw err;
        console.log('Employees table ready');

        // Insert sample data if table is empty
        dbConnection.query('SELECT COUNT(*) as count FROM employees', (err, results) => {
            if (err) throw err;
            if (results[0].count === 0) {
                const sampleEmployees = [
                    ['John Doe', 'Software Engineer', 'IT'],
                    ['Jane Smith', 'HR Manager', 'Human Resources'],
                    ['Bob Johnson', 'Accountant', 'Finance']
                ];
                sampleEmployees.forEach(emp => {
                    dbConnection.query('INSERT INTO employees (name, position, department) VALUES (?, ?, ?)', emp, (err) => {
                        if (err) console.log('Error inserting sample:', err);
                    });
                });
                console.log('Sample employees inserted');
            }
        });
    });
});

// Routes
app.get('/api/employees', (req, res) => {
    console.log('GET /api/employees called');
    if (!dbConnection) {
        console.log('Database not connected');
        return res.status(500).json({ error: 'Database not connected' });
    }
    const query = `
        SELECT
            e.emp_id AS id,
            CONCAT(e.first_name, ' ', e.last_name) AS name,
            IFNULL(p.position_name, 'Unknown') AS position,
            IFNULL(d.dept_name, 'Unknown') AS department
        FROM employees e
        LEFT JOIN positions p ON e.position_id = p.position_id
        LEFT JOIN departments d ON e.dept_id = d.dept_id
        ORDER BY e.emp_id
    `;
    dbConnection.query(query, (err, results) => {
        if (err) {
            console.log('Query error:', err);
            throw err;
        }
        console.log('Employees fetched:', results.length);
        res.json(results);
    });
});

function findOrCreateDepartment(deptName, callback) {
    dbConnection.query('SELECT dept_id FROM departments WHERE dept_name = ?', [deptName], (err, results) => {
        if (err) return callback(err);
        if (results.length > 0) return callback(null, results[0].dept_id);
        dbConnection.query('INSERT INTO departments (dept_name) VALUES (?)', [deptName], (err, result) => {
            if (err) return callback(err);
            callback(null, result.insertId);
        });
    });
}

function findOrCreatePosition(positionName, callback) {
    dbConnection.query('SELECT position_id FROM positions WHERE position_name = ?', [positionName], (err, results) => {
        if (err) return callback(err);
        if (results.length > 0) return callback(null, results[0].position_id);
        dbConnection.query('INSERT INTO positions (position_name, base_rate) VALUES (?, ?)', [positionName, 0.00], (err, result) => {
            if (err) return callback(err);
            callback(null, result.insertId);
        });
    });
}

app.post('/api/employees', (req, res) => {
    console.log('POST /api/employees called with:', req.body);
    if (!dbConnection) {
        return res.status(500).json({ error: 'Database not connected' });
    }
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

    findOrCreateDepartment(department, (err, dept_id) => {
        if (err) {
            console.log('Department lookup error:', err);
            return res.status(500).json({ error: 'Department lookup failed' });
        }
        findOrCreatePosition(position, (err, position_id) => {
            if (err) {
                console.log('Position lookup error:', err);
                return res.status(500).json({ error: 'Position lookup failed' });
            }
            dbConnection.query(
                'INSERT INTO employees (first_name, last_name, email, phone, dept_id, position_id, basic_salary, hire_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [first_name, last_name, email, phone, dept_id, position_id, basic_salary, hire_date, status],
                (err, result) => {
                    if (err) {
                        console.log('Employee insert error:', err);
                        return res.status(500).json({ error: 'Employee insert failed' });
                    }
                    console.log('Employee inserted:', result.insertId);
                    res.json({ id: result.insertId, first_name, last_name, email, phone, department, position, basic_salary, hire_date, status });
                }
            );
        });
    });
});

app.delete('/api/employees/:id', (req, res) => {
    if (!dbConnection) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    const { id } = req.params;
    dbConnection.query('DELETE FROM employees WHERE emp_id = ?', [id], (err) => {
        if (err) throw err;
        res.json({ message: 'Employee deleted' });
    });
});

app.get('/api/attendance', (req, res) => {
    console.log('GET /api/attendance called');
    if (!dbConnection) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    const query = `
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
        ORDER BY a.work_date DESC, a.attendance_id DESC
    `;
    dbConnection.query(query, (err, results) => {
        if (err) {
            console.log('Attendance query error:', err);
            throw err;
        }
        res.json(results);
    });
});

app.post('/api/attendance', (req, res) => {
    console.log('POST /api/attendance called with:', req.body);
    if (!dbConnection) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    const { emp_id, work_date, time_in, time_out, status, overtime_hours } = req.body;
    dbConnection.query(
        'INSERT INTO attendance (emp_id, work_date, time_in, time_out, status, overtime_hours) VALUES (?, ?, ?, ?, ?, ?)',
        [emp_id, work_date, time_in, time_out, status, overtime_hours],
        (err, result) => {
            if (err) {
                console.log('Attendance insert error:', err);
                throw err;
            }
            console.log('Attendance inserted:', result.insertId);
            res.json({ id: result.insertId, emp_id, work_date, time_in, time_out, status, overtime_hours });
        }
    );
});

app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
});