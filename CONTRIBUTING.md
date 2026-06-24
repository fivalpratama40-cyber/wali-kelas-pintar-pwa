# Contributing to Wali Kelas Pintar PWA

Terima kasih telah tertarik untuk berkontribusi! 🎉

## Code of Conduct

Proyek ini menganut Code of Conduct yang ketat:
- Jangan diskriminasi berdasarkan latar belakang
- Berikan feedback yang constructive
- Hormati opini orang lain
- Fokus pada improvement bersama

## Cara Berkontribusi

### 1. Report Bug
Jika Anda menemukan bug:
1. Buka [GitHub Issues](https://github.com/fivalpratama40-cyber/wali-kelas-pintar-pwa/issues)
2. Klik "New Issue"
3. Gunakan template "Bug Report"
4. Berikan deskripsi lengkap:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots/logs
   - Environment (OS, browser, version)

### 2. Suggest Features
Untuk fitur baru:
1. Buka [GitHub Issues](https://github.com/fivalpratama40-cyber/wali-kelas-pintar-pwa/issues)
2. Klik "New Issue"
3. Gunakan template "Feature Request"
4. Jelaskan:
   - Use case
   - Expected behavior
   - How it improves the application

### 3. Submit Code Changes

#### Setup Development Environment
```bash
# Fork repository
git clone https://github.com/YOUR_USERNAME/wali-kelas-pintar-pwa.git
cd wali-kelas-pintar-pwa

# Create feature branch
git checkout -b feature/your-feature

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Code Style
- Gunakan ESLint config yang sudah ada
- Format dengan Prettier (setup di .prettierrc)
- Ikuti naming conventions:
  - Components: PascalCase (e.g., `StudentList.jsx`)
  - Utilities: camelCase (e.g., `validateEmail`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_ATTEMPTS`)

#### Commit Message
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (no logic change)
- `refactor`: Code refactoring
- `test`: Add/update tests
- `chore`: Build/dependencies

Example:
```
feat(auth): add 2FA support

Implement two-factor authentication using Google Authenticator.
- Add QR code generation
- Add verification logic
- Update security rules

Closes #123
```

#### Submit Pull Request
1. Push branch ke fork
   ```bash
   git push origin feature/your-feature
   ```

2. Buat Pull Request
   - Jelas deskripsi perubahan
   - Reference issue jika ada
   - Screenshot untuk UI changes
   - Checklist:
     - [ ] Code follows style guidelines
     - [ ] No console errors
     - [ ] Tests pass
     - [ ] Documentation updated

## Development Guidelines

### Testing
```bash
# Run linter
npm run lint

# Manual testing di berbagai browser
# Chrome, Firefox, Safari, Edge

# Test offline functionality
# DevTools → Disconnect

# Test mobile
# Chrome DevTools → Device Mode
```

### Performance
- Bundle size harus tetap < 200KB gzipped
- First Contentful Paint harus < 2s
- Gunakan code splitting untuk routes
- Lazy load components ketika diperlukan

### Security
- Jangan commit `.env` files
- Validasi semua input user
- Gunakan parameterized queries
- Follow Firebase security best practices

### Documentation
- Update README jika ada fitur baru
- Add JSDoc comments untuk functions
- Update changelog
- Provide examples dalam documentation

## Release Process

Maintainer akan:
1. Review pull request
2. Run tests
3. Merge ke main branch
4. Create release pada GitHub
5. Update changelog
6. Deploy ke production (jika applicable)

## Questions?

Hubungi maintainer via:
- GitHub Discussions
- Email: fivalpratama40@gmail.com
- Issues section dengan label `question`

Terima kasih! 🙏
