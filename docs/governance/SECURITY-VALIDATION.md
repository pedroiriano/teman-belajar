# Security Validation Guidelines

**Status:** ACTIVE
**Owner:** Engineering Team
**Last Updated:** 2026-08-12

This document defines the strict policies for validating user inputs across all boundaries in the Teman Belajar platform. It is mandatory for every engineer and AI agent to follow these rules to prevent Injection, XSS, Payload Manipulation, and Data Corruption.

## 1. Core Principle: Never Trust the Client

Client-side validation is **strictly for User Experience (UX)**. It provides immediate feedback to the user and saves network requests, but it provides **zero security**. 
All security enforcement, authorization, and sanitization **MUST occur on the Server Side (Go API)**.

## 2. Client-Side Validation (Next.js / React)

### Requirements
1. **Immediate Feedback**: Use HTML5 standard attributes (`required`, `minlength`, `maxlength`, `type="email"`, `pattern`) combined with JavaScript validation.
2. **Form Libraries**: Use established form state libraries (e.g., `react-hook-form` + `zod`) to centralize schema logic.
3. **Payload Type Safety**: The structure sent to the API must precisely match the TypeScript interface. Do not send undocumented fields.
4. **File Uploads**: Restrict allowed extensions (via `accept`) and enforce an initial size check before sending the request. However, do not rely on this to stop malicious uploads.
5. **No Security Decisions**: Do not hide UI elements or restrict form submissions based solely on the assumption that a user cannot bypass it. Assume a malicious user will bypass the UI and make direct HTTP requests via `cURL` or Postman.

## 3. Server-Side Validation (Go API)

### Requirements
1. **Absolute Enforcement**: Every single field originating from an external source (HTTP request, URL params, headers) MUST be validated before being processed or inserted into the database.
2. **Strict Typing**: Parse IDs into exact types (e.g., parse a UUID string strictly using `uuid.Parse()` instead of accepting any string).
3. **Length and Boundary Checks**: 
   - Strings: Enforce maximum and minimum lengths (e.g., `Title` max 255 chars).
   - Integers: Enforce logical bounds (e.g., `page > 0`, `size <= 100`).
4. **MIME & File Validation**:
   - Do NOT trust the `Content-Type` header sent by the client.
   - Always "sniff" the file signature (magic bytes) from the first 512 bytes of the payload (e.g., `0xFF 0xD8 0xFF` for JPEG).
5. **Sanitization vs. Validation**:
   - **Validation**: Reject the request if it is invalid (Return HTTP 400 Bad Request).
   - **Sanitization**: Strip malicious scripts (e.g., `<script>`) only when explicitly accepting rich text. For all other fields, prefer strict validation over silent sanitization.
6. **Authorization Validation**: 
   - Never accept an `actorID` or `userID` from a JSON body for authorization.
   - Always derive the acting user's identity securely from the validated server-side token (e.g., Keycloak JWT via Middleware).

## 4. Bounded Context Strategy

- **BFF (Next.js Backend-for-Frontend)**: Validates that the request conforms to the expected contract before forwarding to the internal API (protects internal routing).
- **Core API (Go)**: Performs the absolute Domain validation and enforces Business Rules (protects the Database).

## 5. Security Checklists (Definition of Done)

Before declaring a feature complete, verify:
- [ ] Are HTML5 validations present on the form?
- [ ] Are custom errors rendered clearly for the user on the frontend?
- [ ] Does the Go backend validate length, type, and boundaries of every input?
- [ ] Does the Go backend sniff binary file contents securely without trusting client claims?
- [ ] Is identity derived solely from the secure token?
- [ ] Are SQL Prepared Statements (or `ExecContext` with args) used for ALL queries? (No string concatenation in SQL).
