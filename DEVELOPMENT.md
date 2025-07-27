# Frontend/Backend Separation Guide

This project now has clearly separated linting and formatting workflows for frontend and backend code.

## Frontend (JavaScript/CSS/HTML)

### Linting

- `npm run lint:frontend` - Lint JavaScript files in the `static/` directory
- `npm run lint:frontend:fix` - Auto-fix JavaScript linting issues

### Formatting

- `npm run format:frontend` - Format frontend files (JS, CSS, HTML, MD, JSON)
- `npm run format:frontend:check` - Check if frontend files are properly formatted

### Configuration

- **ESLint**: `eslint.config.mjs` (modern flat config)
- **Prettier**: `.prettierrc.json`

## Backend (Python)

### Linting

- `npm run lint:backend` - Lint Python files using flake8

### Formatting

- `npm run format:backend` - Format Python files using black and isort
- `npm run format:backend:check` - Check if Python files are properly formatted

### Configuration

- **Flake8**: `.flake8`
- **Black/isort**: `pyproject.toml`

## Combined Commands

### Lint Everything

- `npm run lint` - Run both frontend and backend linting

### Format Everything

- `npm run format` - Format both frontend and backend files
- `npm run format:check` - Check formatting for both frontend and backend

### Code Quality

- `npm run code-quality` - Run all linting and format checks
- `npm run code-fix` - Fix all auto-fixable issues

## Dependencies

### Frontend Dependencies (in package.json)

- eslint, prettier, jest and related plugins

### Backend Dependencies (in requirements-dev.txt)

- flake8, black, isort, pytest and related tools

## Benefits of This Separation

1. **Independent Workflows**: Frontend and backend linting can run independently
2. **Faster CI/CD**: Can run frontend and backend checks in parallel
3. **Clear Responsibility**: Each team/developer knows which tools to use
4. **Easier Debugging**: Linting failures are isolated to their respective domains
5. **Technology-Specific**: Each stack uses its best-in-class tools
