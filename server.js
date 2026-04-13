const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files

// MySQL connection
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'hris_payroll_db'
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

app.post('/api/employees', (req, res) => {
    console.log('POST /api/employees called with:', req.body);
    if (!dbConnection) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    const { name, position, department } = req.body;
    dbConnection.query('INSERT INTO employees (name, position, department) VALUES (?, ?, ?)', [name, position, department], (err, result) => {
        if (err) {
            console.log('Insert error:', err);
            throw err;
        }
        console.log('Employee inserted:', result.insertId);
        res.json({ id: result.insertId, name, position, department });
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

app.listen(port, '127.0.0.1', () => {
    console.log(`Server running at http://127.0.0.1:${port}`);
});