# Enterprise DevSecOps Architecture & Toolchain Blueprint

**Application Ecosystem:**
1. **Mobile Application:** Android Core (`StealthApp` — Java/AndroidKeyStore/Room/SQLCipher)
2. **Web Dashboard:** Next.js 14 App Router (`SEALTHAPPDASHBOARD` — React/Tailwind/Node.js)
3. **Cloud & Database:** Firebase Realtime Database & Cloud Firestore (Security Rules + Admin SDK)
4. **CI/CD Platform:** GitHub Actions

---

## 1. Complete DevSecOps Toolchain Matrix (100% Free & Open-Source)

| Security Layer | Tool | Target Stack | What It Does | Execution Method |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile SAST** | **MobSF / mobsfscan** | Android (`.java`, `AndroidManifest.xml`, `file_paths.xml`) | Deep mobile static analysis: checks exported components, cryptographic misuse, permission leaks, and cleartext traffic. | GitHub Action (`MobSF/mobsfscan-action`) & local CLI |
| **Web & API SAST** | **Semgrep** | Next.js (`.js`, `.jsx`, `/api/*`) & Android (`.java`) | Semantic AST code scanner: detects OWASP Top 10, JWT signature bypasses, missing auth middleware, and injection bugs. | GitHub Action (`semgrep/semgrep-action`) |
| **Semantic Taint SAST**| **GitHub CodeQL** | Next.js API routes & Android | Deep data-flow tracking from HTTP request entrypoints to database/crypto operations to detect taint leaks. | GitHub Action (`github/codeql-action`) |
| **Secret Scanning** | **Gitleaks / TruffleHog** | Git History & Working Tree | Detects hardcoded AES keys, Firebase service account credentials, JWT tokens, and high-entropy secrets. | Pre-commit hook & GitHub Action (`gitleaks/gitleaks-action`) |
| **Dependency SCA** | **OSV-Scanner & Dependabot**| `package.json` & `build.gradle` | Scans 3rd-party dependencies for known CVEs across npm and Maven registries using Google's OSV database. | GitHub Native / CLI |
| **Cloud Rules Auditor**| **Firebase Rules Auditor** | `database.rules.json` & `firestore.rules` | Red-team assessment of Firebase database rules: checks unauthenticated writes, privilege escalations, and wildcard holes. | Antigravity Built-in Skill |
| **Dynamic DAST** | **OWASP ZAP Baseline** | Live Next.js Web APIs (`/api/*`) | Automated dynamic black-box scanning: verifies HTTP security headers, CORS policies, rate limiting, and auth boundaries. | GitHub Action (`zaproxy/action-baseline`) |
| **AI PR Review** | **CodeRabbit** | Both Repositories | Context-aware AI pull request review with assertive security profile configured via `.coderabbit.yaml`. | GitHub App / Agent Skill |

---

## 2. DevSecOps Execution Workflow

```
+-----------------------------------------------------------------------------------+
|                           DEVELOPER / CODE COMMIT                                 |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| STAGE 1: PRE-COMMIT GUARD (Local Machine - Zero Code Modification)                |
| • Gitleaks: Blocks accidental commit of private keys or service account JSON      |
| • Antigravity Security Agent: Read-only local lint & vulnerability verification    |
+-----------------------------------------------------------------------------------+
                                         │  (git push)
                                         ▼
+-----------------------------------------------------------------------------------+
| STAGE 2: CONTINUOUS INTEGRATION PIPELINE (GitHub Actions)                         |
|                                                                                   |
|  [Android Pipeline: StealthApp]           [Web Pipeline: StealthDashbaord]        |
|  ├── MobSFScan (Android SAST)              ├── Semgrep (Next.js & API SAST)        |
|  ├── CodeQL (Java Semantic Analysis)       ├── CodeQL (JavaScript/Node Analysis)   |
|  ├── OSV-Scanner (Gradle Dependencies)     ├── Dependabot (npm Dependencies)       |
|  └── Build Verification & Keystore Guard   └── Firebase Rules Lint & Validation    |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| STAGE 3: SECURITY GATE & SARIF REPORTING (GitHub Security Tab)                     |
| • All results aggregated into GitHub Security -> Code Scanning                    |
| • PRs automatically blocked if Critical/High vulnerabilities are found            |
| • CodeRabbit posts line-by-line review commentary on pull requests                |
+-----------------------------------------------------------------------------------+
                                         │  (Merge & Deploy)
                                         ▼
+-----------------------------------------------------------------------------------+
| STAGE 4: POST-DEPLOYMENT VERIFICATION (Production / Staging)                       |
| • OWASP ZAP Baseline: Dynamic scan of exposed endpoints (/api/app-update, etc.)  |
| • Antigravity Security Auditor: Periodic deep-scan of Firebase Security Rules     |
+-----------------------------------------------------------------------------------+
```

---

## 3. Ready-to-Use GitHub Actions Workflow Templates

### A. Next.js Dashboard Security Pipeline (`.github/workflows/devsecops-dashboard.yml`)
```yaml
name: DevSecOps Dashboard Pipeline

on:
  push:
    branches: [ main, staging ]
  pull_request:
    branches: [ main ]

jobs:
  security-audit:
    name: Code & Secret Security Audit
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Secret Scanning (Gitleaks)
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: SAST Security Scan (Semgrep)
        uses: semgrep/semgrep-action@v1
        with:
          config: >-
            p/javascript
            p/typescript
            p/security-audit
            p/secrets
            p/owasp-top-ten

      - name: Dependency Vulnerability Audit (npm)
        run: npm audit --audit-level=high

      - name: Google OSV-Scanner (Dependencies)
        uses: google/osv-scanner-action@v1.8.2
        with:
          scan-args: |-
            --lockfile=package-lock.json
```

### B. Android App Security Pipeline (`.github/workflows/devsecops-android.yml`)
```yaml
name: DevSecOps Android Pipeline

on:
  push:
    branches: [ main, staging ]
  pull_request:
    branches: [ main ]

jobs:
  mobile-security:
    name: Mobile App Static Analysis
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: MobSFScan Mobile SAST
        uses: MobSF/mobsfscan-action@main
        with:
          args: --sarif --output mobsf-results.sarif .

      - name: Upload MobSF SARIF Results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: mobsf-results.sarif

      - name: Semgrep Android (Java Security)
        uses: semgrep/semgrep-action@v1
        with:
          config: >-
            p/java
            p/security-audit
            p/secrets

      - name: Secret Scanning (Gitleaks)
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 4. Implementation Steps

1. **GitHub Actions Deployment:**
   - Commit the workflow files into `.github/workflows/` in both repositories. They run automatically on push/PR with zero manual effort.
2. **Continuous Read-Only Agent Audits:**
   - The Antigravity AI Security Sentinel will regularly execute local scans across new commits and verify remediations without modifying code.
3. **Automated Alerting:**
   - Security findings stream directly into your GitHub Security tab, giving you a centralized dashboard for all vulnerabilities.
