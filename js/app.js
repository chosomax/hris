// API base URL
const API_URL = 'http://localhost:3000/api';

const positionSalaryMap = {
    'Software Engineer': 45000.00,
    'HR Manager': 38000.00,
    'Accountant': 32000.00,
    'Sales Associate': 25000.00,
    'Customer Support': 22000.00,
    'Intern': 12000.00
};
const HOURS_PER_MONTH = 208; // 26 working days × 8 hours

function formatPesos(value) {
    const amount = Number(value) || 0;
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getSalaryForPosition(position) {
    return positionSalaryMap[position.trim()] || 0;
}

function getHourlyRate(salary) {
    return salary > 0 ? salary / HOURS_PER_MONTH : 0;
}

function updateHourlyRateDisplay() {
    const salaryInput = document.getElementById('salary');
    const hourlyRateInput = document.getElementById('hourly-rate');
    if (!salaryInput || !hourlyRateInput) return;
    const salary = parseFloat(salaryInput.value) || 0;
    hourlyRateInput.value = formatPesos(getHourlyRate(salary));
}

function updateSalaryFromPosition() {
    const positionInput = document.getElementById('position');
    const salaryInput = document.getElementById('salary');
    if (!positionInput || !salaryInput) return;
    const salary = getSalaryForPosition(positionInput.value || '');
    if (salary > 0) {
        salaryInput.value = salary.toFixed(2);
    }
    updateHourlyRateDisplay();
}

function setupSalaryAutomation() {
    const positionInput = document.getElementById('position');
    const salaryInput = document.getElementById('salary');
    if (positionInput) {
        positionInput.addEventListener('input', updateSalaryFromPosition);
        positionInput.addEventListener('blur', updateSalaryFromPosition);
        positionInput.addEventListener('change', updateSalaryFromPosition);
    }
    if (salaryInput) {
        salaryInput.addEventListener('input', updateHourlyRateDisplay);
    }
}

// Initialize position and department dropdowns
async function initializeDropdowns() {
    const positionInput = document.getElementById('position');
    const departmentInput = document.getElementById('department');
    
    if (positionInput) {
        const positions = await fetchPositions();
        positionInput.innerHTML = '<option value="">Select a position</option>';
        positions.forEach(position => {
            const option = document.createElement('option');
            option.value = position.name;
            option.textContent = position.name;
            positionInput.appendChild(option);
        });
    }
    
    if (departmentInput) {
        const departments = await fetchDepartments();
        departmentInput.innerHTML = '<option value="">Select a department</option>';
        departments.forEach(department => {
            const option = document.createElement('option');
            option.value = department.name;
            option.textContent = department.name;
            departmentInput.appendChild(option);
        });
    }
}

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

// Function to fetch departments from server
async function fetchDepartments() {
    try {
        const response = await fetch(`${API_URL}/departments`);
        const departments = await response.json();
        return departments;
    } catch (error) {
        console.error('Error fetching departments:', error);
        return [];
    }
}

// Function to fetch positions from server
async function fetchPositions() {
    try {
        const response = await fetch(`${API_URL}/positions`);
        const positions = await response.json();
        return positions;
    } catch (error) {
        console.error('Error fetching positions:', error);
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
            const salary = Number(employee.basic_salary) || 0;
            const hourlyRate = getHourlyRate(salary);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${employee.id}</td>
                <td>${employee.name}</td>
                <td>${employee.position}</td>
                <td>${employee.department}</td>
                <td>${formatPesos(salary)}</td>
                <td>${formatPesos(hourlyRate)}</td>
                <td><button onclick="deleteEmployee(${employee.id})">Delete</button></td>
            `;
            employeeList.appendChild(row);
        });
    }
}


// Function to delete employee
async function deleteEmployee(id) {
    if (confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
        const response = await fetch(`${API_URL}/employees/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (!response.ok) {
            alert('Error: ' + (result.error || 'Failed to delete employee'));
            return;
        }
        
        await renderEmployees();
        alert('Employee deleted successfully.');
    }
}

function validateEmployeeData(employee) {
    if (!employee.first_name) return { valid: false, message: 'First name is required.' };
    if (!employee.last_name) return { valid: false, message: 'Last name is required.' };
    if (!employee.email) return { valid: false, message: 'Email is required.' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employee.email)) return { valid: false, message: 'Enter a valid email address.' };
    if (!employee.phone) return { valid: false, message: 'Phone number is required.' };
    const phoneRegex = /^[0-9+\- ]{7,20}$/;
    if (!phoneRegex.test(employee.phone)) return { valid: false, message: 'Enter a valid phone number (digits, +, -, spaces).' };
    if (!employee.position) return { valid: false, message: 'Position is required.' };
    if (!employee.department) return { valid: false, message: 'Department is required.' };
    if (!employee.hire_date) return { valid: false, message: 'Hire date is required.' };
    if (!(Number(employee.basic_salary) > 0)) return { valid: false, message: 'Salary must be greater than zero.' };
    return { valid: true };
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

        const validation = validateEmployeeData(employee);
        if (!validation.valid) {
            alert(validation.message);
            return;
        }

        const newEmployee = await addEmployeeAPI(employee);
        if (newEmployee) {
            addEmployeeForm.reset();
            updateHourlyRateDisplay();
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

// Function to delete attendance via API
async function deleteAttendanceAPI(id) {
    try {
        await fetch(`${API_URL}/attendance/${id}`, {
            method: 'DELETE'
        });
    } catch (error) {
        console.error('Error deleting attendance:', error);
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
async function renderAttendance(filters = {}) {
    const attendanceList = document.getElementById('attendance-list');
    if (attendanceList) {
        let attendance = await fetchAttendance();
        
        // Apply filters if provided
        if (filters.emp_id && filters.emp_id !== '') {
            attendance = attendance.filter(record => record.emp_id === parseInt(filters.emp_id));
        }
        if (filters.date_from && filters.date_from !== '') {
            attendance = attendance.filter(record => record.work_date >= filters.date_from);
        }
        if (filters.date_to && filters.date_to !== '') {
            attendance = attendance.filter(record => record.work_date <= filters.date_to);
        }
        
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
                <td><button onclick="deleteAttendance(${record.id})">Delete</button></td>
            `;
            attendanceList.appendChild(row);
        });
    }
}

// Function to delete attendance
async function deleteAttendance(id) {
    if (confirm('Are you sure you want to delete this attendance record?')) {
        await deleteAttendanceAPI(id);
        await renderAttendance();
    }
}

// Populate employee select for attendance form
async function populateAttendanceEmployees() {
    const employeeSelect = document.getElementById('employee-select');
    const filterEmployee = document.getElementById('filter-employee');
    const employees = await fetchEmployees();
    
    if (employeeSelect) {
        employeeSelect.innerHTML = '<option value="">Select an employee</option>';
        employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = `${employee.name} (${employee.position})`;
            employeeSelect.appendChild(option);
        });
    }
    
    if (filterEmployee) {
        filterEmployee.innerHTML = '<option value="">All Employees</option>';
        employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = `${employee.name} (${employee.position})`;
            filterEmployee.appendChild(option);
        });
    }
}

function validateAttendanceData(emp_id, work_date, timeInValue, timeOutValue, status, overtime_hours) {
    if (!emp_id) return { valid: false, message: 'Please select an employee.' };
    if (!work_date) return { valid: false, message: 'Please enter a work date.' };
    
    // Only require time_in and time_out if status is PRESENT or LATE
    if (status === 'PRESENT' || status === 'LATE') {
        if (!timeInValue) return { valid: false, message: 'Please enter a time in value.' };
        if (!timeOutValue) return { valid: false, message: 'Please enter a time out value.' };
        return validateAttendanceTimes(work_date, timeInValue, timeOutValue);
    }
    
    if (!status) return { valid: false, message: 'Please select a status.' };
    if (Number.isNaN(overtime_hours) || overtime_hours < 0) return { valid: false, message: 'Overtime hours must be zero or greater.' };
    return { valid: true };
}

function validateAttendanceTimes(work_date, timeInValue, timeOutValue) {
    const timeIn = new Date(`${work_date}T${timeInValue}:00`);
    const timeOut = new Date(`${work_date}T${timeOutValue}:00`);

    if (Number.isNaN(timeIn.getTime()) || Number.isNaN(timeOut.getTime())) {
        return { valid: false, message: 'The provided time values are invalid.' };
    }

    if (timeOut <= timeIn) {
        return { valid: false, message: 'Time out must be later than time in.' };
    }

    return { valid: true };
}

// Event listener for time-in to auto-set LATE status
const timeInInput = document.getElementById('time-in');
if (timeInInput) {
    timeInInput.addEventListener('change', function() {
        const timeValue = this.value;
        const statusSelect = document.getElementById('status');
        if (timeValue && statusSelect) {
            // Parse time and check if it's after 9:00 AM
            const [hours, minutes] = timeValue.split(':').map(Number);
            const timeInMinutes = hours * 60 + minutes;
            const nineAmMinutes = 9 * 60; // 9:00 AM
            
            // Only auto-set if current status is PRESENT
            if (statusSelect.value === 'PRESENT' && timeInMinutes > nineAmMinutes) {
                statusSelect.value = 'LATE';
            }
        }
    });
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

        const validation = validateAttendanceData(emp_id, work_date, timeInValue, timeOutValue, status, overtime_hours);
        if (!validation.valid) {
            alert(validation.message);
            return;
        }

        const time_in = `${work_date}T${timeInValue}:00`;
        const time_out = `${work_date}T${timeOutValue}:00`;

        await addAttendanceAPI(emp_id, work_date, time_in, time_out, status, overtime_hours);
        attendanceForm.reset();
        await renderAttendance();
        alert('Attendance record added successfully!');
    });
}

// Event listeners for attendance filters
const applyFiltersBtn = document.getElementById('apply-filters');
const clearFiltersBtn = document.getElementById('clear-filters');

if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', async function() {
        const emp_id = document.getElementById('filter-employee').value;
        const date_from = document.getElementById('filter-date-from').value;
        const date_to = document.getElementById('filter-date-to').value;
        
        const filters = {};
        if (emp_id) filters.emp_id = emp_id;
        if (date_from) filters.date_from = date_from;
        if (date_to) filters.date_to = date_to;
        
        await renderAttendance(filters);
    });
}

if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', async function() {
        document.getElementById('filter-employee').value = '';
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        await renderAttendance();
    });
}

// Payroll Functions
async function fetchPayroll() {
    try {
        const response = await fetch(`${API_URL}/payroll`);
        const payroll = await response.json();
        return payroll;
    } catch (error) {
        console.error('Error fetching payroll:', error);
        return [];
    }
}

async function generatePayroll(periodStart, periodEnd) {
    try {
        const response = await fetch(`${API_URL}/payroll/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ period_start: periodStart, period_end: periodEnd })
        });
        const result = await response.json();
        if (response.ok) {
            alert('Payroll generated successfully!');
        } else {
            alert('Error: ' + (result.error || 'Failed to generate payroll'));
        }
        return result;
    } catch (error) {
        console.error('Error generating payroll:', error);
        alert('Error generating payroll: ' + error.message);
        return null;
    }
}

async function fetchPayslip(payrollId) {
    try {
        const response = await fetch(`${API_URL}/payroll/${payrollId}/slip`);
        const payslip = await response.json();
        return payslip;
    } catch (error) {
        console.error('Error fetching payslip:', error);
        return null;
    }
}

async function renderPayroll() {
    const payrollList = document.getElementById('payroll-list');
    if (!payrollList) return;

    payrollList.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#888;">Loading payroll records...</td></tr>';

    const payroll = await fetchPayroll();
    payrollList.innerHTML = '';

    if (!payroll.length) {
        payrollList.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#888;">No payroll records found. Use the form above to generate payroll.</td></tr>';
        return;
    }

    payroll.forEach(record => {
        const row = document.createElement('tr');
        const periodStart = new Date(record.period_start).toLocaleDateString('en-PH');
        const periodEnd = new Date(record.period_end).toLocaleDateString('en-PH');
        const statusBadge = record.status === 'PAID'
            ? '<span style="color:green;font-weight:500;">PAID</span>'
            : '<span style="color:orange;font-weight:500;">DRAFT</span>';
        row.innerHTML = `
            <td>${record.id}</td>
            <td>${record.employee || 'Unknown'}</td>
            <td>${periodStart} – ${periodEnd}</td>
            <td>${formatPesos(record.basic_salary)}</td>
            <td>${formatPesos(record.gross_pay)}</td>
            <td>${formatPesos(record.total_deductions || 0)}</td>
            <td>${formatPesos(record.net_pay)}</td>
            <td>${statusBadge}</td>
            <td><button onclick="viewPayslip(${record.id})" class="slip-button">View Slip</button></td>
        `;
        payrollList.appendChild(row);
    });
}

async function viewPayslip(payrollId) {
    window.location.href = `payslip.html?payroll_id=${payrollId}`;
}

async function renderPayslip(payrollId) {
    const payslip = await fetchPayslip(payrollId);

    if (!payslip || payslip.error) {
        document.body.innerHTML = '<div style="padding:40px;text-align:center;"><p>Error loading payslip. <a href="payroll.html">Go back to Payroll</a></p></div>';
        return;
    }

    // Employee info
    document.getElementById('emp-name').textContent = payslip.employee_name || '—';
    document.getElementById('emp-email').textContent = payslip.email || '—';
    document.getElementById('emp-position').textContent = payslip.position || '—';
    document.getElementById('emp-department').textContent = payslip.department || '—';
    document.getElementById('payroll-id').textContent = payslip.payroll_id;
    document.getElementById('basic-salary').textContent = formatPesos(payslip.basic_salary);
    document.getElementById('gross-pay').textContent = formatPesos(payslip.gross_pay);
    document.getElementById('total-hours').textContent = `${payslip.total_hours || 0} hrs`;

    const periodStart = new Date(payslip.period_start).toLocaleDateString('en-PH');
    const periodEnd = new Date(payslip.period_end).toLocaleDateString('en-PH');
    document.getElementById('payslip-period').textContent = `Pay Period: ${periodStart} to ${periodEnd}`;
    document.getElementById('payroll-period').textContent = `${periodStart} to ${periodEnd}`;

    // Allowances
    const allowancesList = document.getElementById('allowances-list');
    allowancesList.innerHTML = '';
    let allowanceTotal = 0;
    if (payslip.allowances && payslip.allowances.length > 0) {
        payslip.allowances.forEach(allowance => {
            const amount = parseFloat(allowance.amount) || 0;
            allowanceTotal += amount;
            const item = document.createElement('div');
            item.className = 'payslip-item';
            item.innerHTML = `
                <span class="label">${allowance.description || allowance.type}</span>
                <span class="amount">${formatPesos(amount)}</span>
            `;
            allowancesList.appendChild(item);
        });
        const total = document.createElement('div');
        total.className = 'payslip-item total';
        total.innerHTML = `<span class="label">Total Allowances</span><span class="amount">${formatPesos(allowanceTotal)}</span>`;
        allowancesList.appendChild(total);
    } else {
        allowancesList.innerHTML = '<div class="payslip-item"><span class="label" style="color:#888;">No allowances this period</span></div>';
    }

    // Deductions
    const deductionsList = document.getElementById('deductions-list');
    deductionsList.innerHTML = '';
    let deductionTotal = 0;
    if (payslip.deductions && payslip.deductions.length > 0) {
        payslip.deductions.forEach(deduction => {
            const amount = parseFloat(deduction.amount) || 0;
            deductionTotal += amount;
            const item = document.createElement('div');
            item.className = 'payslip-item';
            item.innerHTML = `
                <span class="label">${deduction.description || deduction.type}</span>
                <span class="amount">${formatPesos(amount)}</span>
            `;
            deductionsList.appendChild(item);
        });
        const total = document.createElement('div');
        total.className = 'payslip-item total';
        total.innerHTML = `<span class="label">Total Deductions</span><span class="amount">${formatPesos(deductionTotal)}</span>`;
        deductionsList.appendChild(total);
    } else {
        deductionsList.innerHTML = '<div class="payslip-item"><span class="label" style="color:#888;">No deductions this period</span></div>';
    }

    // Net pay
    document.getElementById('net-pay-amount').textContent = formatPesos(payslip.net_pay);
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    // Only render employee list if on employees page
    if (document.getElementById('employee-list')) {
        renderEmployees();
    }

    // Only render attendance and populate if on attendance page
    if (document.getElementById('attendance-list')) {
        renderAttendance();
        populateAttendanceEmployees();
    }

    // Only initialize dropdowns if on add-employee page
    if (document.getElementById('add-employee-form')) {
        initializeDropdowns();
        setupSalaryAutomation();
    }

    // Only render payroll if on payroll page
    if (document.getElementById('payroll-list')) {
        renderPayroll();
    }
});