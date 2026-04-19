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

const positionBaseRates = {
    'Software Engineer': 45000.00,
    'HR Manager': 38000.00,
    'Accountant': 32000.00,
    'Sales Associate': 25000.00,
    'Customer Support': 22000.00,
    'Intern': 12000.00
};

let dbConnection = mysql.createConnection(dbConfig);

dbConnection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to hris_payroll_db');

    dbConnection.query(`
        CREATE TABLE IF NOT EXISTS departments (
            dept_id INT AUTO_INCREMENT PRIMARY KEY,
            dept_name VARCHAR(255) UNIQUE NOT NULL
        )
    `, (err) => {
        if (err) throw err;
        dbConnection.query(`
            CREATE TABLE IF NOT EXISTS positions (
                position_id INT AUTO_INCREMENT PRIMARY KEY,
                position_name VARCHAR(255) UNIQUE NOT NULL,
                base_rate DECIMAL(12,2) DEFAULT 0.00
            )
        `, (err) => {
            if (err) throw err;
            dbConnection.query(`
                CREATE TABLE IF NOT EXISTS employees (
                    emp_id INT AUTO_INCREMENT PRIMARY KEY,
                    first_name VARCHAR(255) NOT NULL,
                    last_name VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    phone VARCHAR(50),
                    dept_id INT NOT NULL,
                    position_id INT NOT NULL,
                    basic_salary DECIMAL(12,2) DEFAULT 0.00,
                    hire_date DATE NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    FOREIGN KEY (dept_id) REFERENCES departments(dept_id),
                    FOREIGN KEY (position_id) REFERENCES positions(position_id)
                )
            `, (err) => {
                if (err) throw err;
                dbConnection.query(`
                    CREATE TABLE IF NOT EXISTS attendance (
                        attendance_id INT AUTO_INCREMENT PRIMARY KEY,
                        emp_id INT NOT NULL,
                        work_date DATE NOT NULL,
                        time_in DATETIME,
                        time_out DATETIME,
                        status VARCHAR(50),
                        overtime_hours DECIMAL(5,2) DEFAULT 0,
                        FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
                    )
                `, (err) => {
                    if (err) throw err;
                    console.log('Database tables ready');

                    dbConnection.query('SELECT COUNT(*) as count FROM employees', (err, results) => {
                        if (err) throw err;
                        if (results[0].count === 0) {
                            const sampleEmployees = [
                                { first_name: 'John', last_name: 'Doe', position: 'Software Engineer', department: 'IT', basic_salary: 45000.00 },
                                { first_name: 'Jane', last_name: 'Smith', position: 'HR Manager', department: 'Human Resources', basic_salary: 38000.00 },
                                { first_name: 'Bob', last_name: 'Johnson', position: 'Accountant', department: 'Finance', basic_salary: 32000.00 }
                            ];
                            sampleEmployees.forEach(emp => {
                                findOrCreateDepartment(emp.department, (err, dept_id) => {
                                    if (err) return console.log('Error inserting sample department:', err);
                                    findOrCreatePosition(emp.position, (err, position_id) => {
                                        if (err) return console.log('Error inserting sample position:', err);
                                        dbConnection.query(
                                            'INSERT INTO employees (first_name, last_name, email, phone, dept_id, position_id, basic_salary, hire_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)',
                                            [emp.first_name, emp.last_name, null, null, dept_id, position_id, emp.basic_salary, 'ACTIVE'],
                                            (err) => {
                                                if (err) console.log('Error inserting sample employee:', err);
                                            }
                                        );
                                    });
                                });
                            });
                            console.log('Sample employees inserted');
                        }
                    });
                });
            });
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
            IFNULL(d.dept_name, 'Unknown') AS department,
            IFNULL(e.basic_salary, 0.00) AS basic_salary
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
    const baseRate = positionBaseRates[positionName] || 0.00;
    dbConnection.query('SELECT position_id FROM positions WHERE position_name = ?', [positionName], (err, results) => {
        if (err) return callback(err);
        if (results.length > 0) return callback(null, results[0].position_id);
        dbConnection.query('INSERT INTO positions (position_name, base_rate) VALUES (?, ?)', [positionName, baseRate], (err, result) => {
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

    const salary = Number(basic_salary) > 0 ? Number(basic_salary) : (positionBaseRates[position] || 0.00);

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
                [first_name, last_name, email, phone, dept_id, position_id, salary, hire_date, status],
                (err, result) => {
                    if (err) {
                        console.log('Employee insert error:', err);
                        return res.status(500).json({ error: 'Employee insert failed' });
                    }
                    console.log('Employee inserted:', result.insertId);
                    res.json({ id: result.insertId, first_name, last_name, email, phone, department, position, basic_salary: salary, hire_date, status });
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