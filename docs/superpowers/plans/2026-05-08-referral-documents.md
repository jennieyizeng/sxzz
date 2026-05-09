# Referral Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build fixed built-in referral document preview/download/print behavior for upward, downward, and consent documents without adding template configuration.

**Architecture:** Add a pure utility module for document eligibility, content construction, and printable HTML. Wire the shared referral detail page to this utility and keep the current global log mechanism. Remove the system-admin template configuration route and menu entry from active navigation.

**Tech Stack:** React 19, Vite, Node built-in test runner.

---

### Task 1: Fixed Document Rules

**Files:**
- Create: `src/utils/referralDocuments.js`
- Create: `src/utils/referralDocuments.test.js`

- [ ] Write tests for upward/downward eligibility, archive vs active mode, closed archive copy, and consent content.
- [ ] Implement minimal pure functions: `getReferralDocumentAvailability`, `buildReferralDocumentModel`, `buildConsentDocumentModel`, `buildReferralDocumentHtml`.
- [ ] Run `node --test src/utils/referralDocuments.test.js`.

### Task 2: Detail Page Integration

**Files:**
- Modify: `src/pages/shared/ReferralDetail.jsx`
- Modify: `src/context/AppContext.jsx`

- [ ] Replace document-template matching with fixed document helpers.
- [ ] Show `预览双向转诊（转出）单` or `预览双向转诊（回转）单` only when eligibility allows.
- [ ] Keep `下载 PDF` and `打印` under the same eligibility rules.
- [ ] Log `下载 PDF` and `打印转诊单` through `recordReferralDocumentAction`.
- [ ] Add a compact preview modal using generated printable sections.

### Task 3: Consent Template

**Files:**
- Modify: `src/utils/consentUpload.js`
- Modify: `src/components/ConsentOfflinePanel.jsx`
- Modify: `src/pages/shared/ReferralDetail.jsx`

- [ ] Replace the old minimal consent template download text with fixed consent document content.
- [ ] Keep existing upload/replace behavior.
- [ ] Log consent attachment download from referral detail.

### Task 4: Remove Template Configuration Entry

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Layout.jsx`

- [ ] Remove the active system route and menu entry for `转诊文书模板配置`.
- [ ] Do not delete historical source files in this task unless the user asks.

### Task 5: Verification

**Files:**
- Verify only.

- [ ] Run `node --test src/utils/referralDocuments.test.js`.
- [ ] Run `npm run build`.
- [ ] Browser-check one upward in-transit detail and one downward in-transit detail.
