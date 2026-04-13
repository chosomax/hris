# HRIS Website

A Human Resource Information System website built with HTML, CSS, JavaScript, Node.js, and MySQL.

## Features

- View list of employees
- Add new employees
- Delete employees
- Data stored in MySQL database

## Prerequisites

- Node.js installed (download from https://nodejs.org/)
- MySQL installed and running (download from https://dev.mysql.com/downloads/mysql/)

## Setup

1. Install Node.js and MySQL if not already installed.
2. Install dependencies: `npm install`
3. Ensure MySQL is running. Create database if needed (the app will create it).
4. Update MySQL credentials in `server.js` if needed (default: user 'root', no password).
5. Start the server: `npm start`
6. Open `http://localhost:3000` in your browser.

## Files

- `index.html`: Home page
- `employees.html`: Employee list page
- `add-employee.html`: Add employee page
- `css/style.css`: Stylesheet
- `js/app.js`: Frontend JavaScript
- `server.js`: Backend server
- `package.json`: Dependencies