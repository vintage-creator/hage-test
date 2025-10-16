# Contributing Guidelines

Thank you for contributing to **Hage Logistics**!

We value clean, consistent, and collaborative development. Please follow these guidelines to make the development process smooth for everyone.


## General Workflow

1. **Fork** the repository
2. **Create a branch** from `main` for your feature or fix:
   ```bash
   git checkout -b feat/short-description
   ```
   Example: ```feat/add-shipment-tracking``` or ```fix/validation-error```
3. Make your changes and commit with a conventional commit message (see below)
4. Push your branch and create a Pull Request
5. Wait for review and approval before merging


## Commit Message Convention

We use **Conventional Commits**:
```bash
<type>(<scope>): <short description>
```

### Types

- `feat` – new feature  
- `fix` – bug fix  
- `docs` – documentation changes  
- `style` – formatting, missing semi-colons, etc.  
- `refactor` – code change that neither fixes a bug nor adds a feature  
- `test` – adding or updating tests  
- `chore` – maintenance

### Examples

- feat(auth): add JWT authentication
- fix(shipments): resolve tracking number conflict
- docs(readme): update setup instructions


## Branch Naming Convention

```bash
type/short-description
```

### Examples

- feat/add-auth-module
- fix/invalid-tracking-error
- chore/update-ci-pipeline


## Testing Before PR

Please ensure all tests pass **before creating a Pull Request**:

```bash
npm run test
npm run test:e2e
```

## Code Style

- Use **TypeScript best practices**
- Run `npm run lint` before pushing
- Keep functions and classes **small** and **single-responsibility**
- Document complex logic with **clear, concise comments**


## Security

- Never commit `.env` files or secrets
- Do not log sensitive information
- Use **environment variables** for configuration

## Pull Request Guidelines

- Keep PRs **small and focused**
- Include a **clear description** of the changes
- Link related issues (if any)
- Add or update **tests** where applicable

Thank you for helping build the future of logistics with Hage! 