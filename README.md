# HRIS Website

A Human Resource Information System website built with HTML, CSS, JavaScript, Node.js, and MySQL.

## Features

- View list of employees
- Add new employees
- Delete employees
- Manage attendance
- Data stored in MySQL database

## Prerequisites

- Node.js installed (download from https://nodejs.org/)
- MySQL installed and running (download from https://dev.mysql.com/downloads/mysql/)
- Git for cloning the repository

## Setup for Collaborators

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd hris
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env`:
     ```
     cp .env.example .env
     ```
   - Edit `.env` with your MySQL credentials:
     ```
     DB_HOST=localhost
     DB_PORT=3306
     DB_USER=your_mysql_user
     DB_PASSWORD=your_mysql_password
     DB_NAME=hris_payroll_db
     ```

4. **Set up the database**:
   - Ensure MySQL is running.
   - Create the database: `hris_payroll_db`
   - Import the schema (if provided) or let the app create tables on first run.
   - Note: The app expects tables `employees`, `attendance`, `positions`, `departments` with specific columns.

5. **Start the server**:
   ```
   npm start
   ```

6. **Access the app**:
   - Open `http://localhost:3000` in your browser.

## Database Access

- Each collaborator needs their own MySQL instance.
- The database is local; collaborators cannot access your machine's DB.
- Use the `.env` file to configure their own DB connection.

## Files

- `index.html`: Home page
- `employees.html`: Employee list page
- `add-employee.html`: Add employee page
- `attendance.html`: Attendance management page
- `css/style.css`: Stylesheet
- `js/app.js`: Frontend JavaScript
- `server.js`: Backend server
- `package.json`: Dependencies
- `.env.example`: Environment variables template