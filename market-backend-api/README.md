# market-backend-api

This is the backend service for the hypermarket management system built with FastAPI.

## Features

- User Authentication (Admin and Customer)
- Product Management
- Customer Management
- Invoice Management
- Dashboard Analytics
- Local Database Storage

## Setup

1. Create a virtual environment and activate it:

```bash
python3 -m venv env
source env/bin/activate
```

2. Install the dependencies:

```bash
pip install -r requirements.txt
```

3. Run the development server:

```bash
uvicorn main:app --reload
```

## Project Structure

- `main.py`: The entry point of the application
- `app/`: Contains all application modules
  - `auth/`: Authentication-related logic
  - `products/`: Product management functionality
  - `customers/`: Customer management functionality
  - `invoices/`: Invoice management functionality
  - `dashboard/`: Dashboard analytics logic

## API Documentation

Access the interactive API documentation at `/docs` after running the server.
