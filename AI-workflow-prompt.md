# AI Workflow Prompt for Node.js/ESM Modernization

## Objective
Continue modernizing and validating my Node.js/ESM project for full ES6, ESM, Jest, and lint compatibility.

## Trusted Commands
Use the following trusted commands for all steps:
- `npm run lint`
- `npm run lint:fix`
- `npx eslint .`
- `npx eslint --fix .`
- `npx prettier --write .`
- `npx prettier --check .`
- `npx jest`
- `npx jest --config=jest.config.mjs`
- `npx jest --coverage`
- `npm run test`
- `npm run test:unit`
- `npm run test:integration`
- `npm run build`
- `cat *`

## Workflow Steps
1. **Lint and Fix Code**
   - Run ESLint and Prettier to lint and auto-fix all code.
   - Commands:
     - `npm run lint`
     - `npm run lint:fix`
     - `npx eslint .`
     - `npx eslint --fix .`
     - `npx prettier --write .`
     - `npx prettier --check .`

2. **Run Tests**
   - Run the full test suite and collect results.
   - Command:
     - `npx jest --config=jest.config.mjs`

3. **Export Test Results to PDF**
   - Use a tool like `markdown-pdf` or another Node.js PDF generator to convert the test output or summary to PDF.
   - Example command:
     - `npx markdown-pdf test-results.md`

4. **Show Each Step and Output**
   - Display the command used and confirm the output for each step.

5. **Error Handling**
   - If any errors or failures occur, provide actionable fixes and re-run the relevant commands.

---


## Project Rules & Best Practices Checklist

- Always use ES6/ESM syntax for all new code and refactors.
- Explicitly import Jest globals from `@jest/globals` in every test file.
- Run `npm run lint` and `npx prettier --check .` before every commit.
- Ensure all modules use named exports for ESM compatibility.
- Document any changes or fixes in the CHANGELOG.md.
- If working with Azure, always use Azure tools and follow best practices.
- Automate test result exports and include them in project documentation.

This checklist should be followed for every workflow and code change in this project.
