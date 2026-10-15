# Security Policy

If you find a security problem, please **don't open a public issue**.
Use GitHub's "Report a vulnerability" button (Security tab) to tell the maintainers privately.

gitwrapped runs on people's private code, so we take these seriously:

- It must **never make network requests**.
- It must **never modify** a repository.
- Everything written into the HTML report must be **escaped** (commit messages and names are untrusted).

Reports that break any of these are especially welcome.
