// API base URL
const API_URL = 'http://localhost:3000/api';

// Function to fetch employees from server
async function fetchEmployees() {
    try {
        const response = await fetch(`${API_URL}/employees`);
        const employees = await response.json();
        return employees;
    } catch (error) {
        console.error('Error fetching employees:', error);
        return [];
    }
}

// Function to add employee via API
async function addEmployeeAPI(employee) {
    try {
        const response = await fetch(`${API_URL}/employees`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(employee)
        });
        const newEmployee = await response.json();
        return newEmployee;
    } catch (error) {
        console.error('Error adding employee:', error);
        return null;
    }
}

// Function to delete employee via API
async function deleteEmployeeAPI(id) {
    try {
        await fetch(`${API_URL}/employees/${id}`, {
            method: 'DELETE'
        });
    } catch (error) {
        console.error('Error deleting employee:', error);
    }
}

// Function to render employee list
async function renderEmployees() {
    const employeeList = document.getElementById('employee-list');
    if (employeeList) {
        const employees = await fetchEmployees();
        employeeList.innerHTML = '';
        employees.forEach(employee => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${employee.id}</td>
                <td>${employee.name}</td>
                <td>${employee.position}</td>
                <td>${employee.department}</td>
                <td><button onclick="deleteEmployee(${employee.id})">Delete</button></td>
            `;
            employeeList.appendChild(row);
        });
    }
}

// Function to add employee
async function addEmployee(name, position, department) {
    const newEmployee = await addEmployeeAPI(name, position, department);
    if (newEmployee) {
        await renderEmployees();
    }
}

// Function to delete employee
async function deleteEmployee(id) {
    await deleteEmployeeAPI(id);
    await renderEmployees();
}

// Event listener for add employee form
const addEmployeeForm = document.getElementById('add-employee-form');
if (addEmployeeForm) {
    addEmployeeForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const employee = {
            first_name: document.getElementById('first-name').value.trim(),
            last_name: document.getElementById('last-name').value.trim(),
            email: document.getElementById('email').value.trim() || null,
            phone: document.getElementById('phone').value.trim() || null,
            position: document.getElementById('position').value.trim(),
            department: document.getElementById('department').value.trim(),
            basic_salary: parseFloat(document.getElementById('salary').value) || 0.00,
            hire_date: document.getElementById('hire-date').value,
            status: 'ACTIVE'
        };

        const newEmployee = await addEmployeeAPI(employee);
        if (newEmployee) {
            addEmployeeForm.reset();
            alert('Employee added successfully and saved to the database.');
        } else {
            alert('Failed to add employee. Please try again.');
        }
    });
}

// Function to fetch attendance from server
async function fetchAttendance() {
    try {
        const response = await fetch(`${API_URL}/attendance`);
        const attendance = await response.json();
        return attendance;
    } catch (error) {
        console.error('Error fetching attendance:', error);
        return [];
    }
}

// Function to add attendance via API
async function addAttendanceAPI(emp_id, work_date, time_in, time_out, status, overtime_hours) {
    try {
        const response = await fetch(`${API_URL}/attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ emp_id, work_date, time_in, time_out, status, overtime_hours })
        });
        const newAttendance = await response.json();
        return newAttendance;
    } catch (error) {
        console.error('Error adding attendance:', error);
        return null;
    }
}

// Function to render attendance list
async function renderAttendance() {
    const attendanceList = document.getElementById('attendance-list');
    if (attendanceList) {
        const attendance = await fetchAttendance();
        attendanceList.innerHTML = '';
        attendance.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.id}</td>
                <td>${record.employee || 'Unknown'}</td>
                <td>${record.work_date ? new Date(record.work_date).toLocaleDateString() : ''}</td>
                <td>${record.time_in ? new Date(record.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                <td>${record.time_out ? new Date(record.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                <td>${record.status}</td>
                <td>${record.overtime_hours}</td>
            `;
            attendanceList.appendChild(row);
        });
    }
}

// Populate employee select for attendance form
async function populateAttendanceEmployees() {
    const employeeSelect = document.getElementById('employee-select');
    if (employeeSelect) {
        const employees = await fetchEmployees();
        employeeSelect.innerHTML = '<option value="">Select an employee</option>';
        employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = `${employee.name} (${employee.position})`;
            employeeSelect.appendChild(option);
        });
    }
}

// Event listener for add attendance form
const attendanceForm = document.getElementById('attendance-form');
if (attendanceForm) {
    attendanceForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const emp_id = document.getElementById('employee-select').value;
        const work_date = document.getElementById('work-date').value;
        const timeInValue = document.getElementById('time-in').value;
        const timeOutValue = document.getElementById('time-out').value;
        const status = document.getElementById('status').value;
        const overtime_hours = parseFloat(document.getElementById('overtime-hours').value) || 0;

        const time_in = `${work_date}T${timeInValue}:00`;
        const time_out = `${work_date}T${timeOutValue}:00`;

        await addAttendanceAPI(emp_id, work_date, time_in, time_out, status, overtime_hours);
        attendanceForm.reset();
        await renderAttendance();
        alert('Attendance record added successfully!');
    });
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    renderEmployees();
    renderAttendance();
    populateAttendanceEmployees();
});