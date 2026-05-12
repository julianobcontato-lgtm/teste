# Security Specification - Olá Prefeitura

## Data Invariants
1. A Report must have a valid title, description, category, and status.
2. Only the creator of a report or an admin can see their private user details (though reports are public).
3. Status can only transition: pending -> in-progress -> resolved.
4. Users cannot modify the `userId` or `createdAt` of a report once created.
5. Users cannot claim to be someone else (uid check).

## The Dirty Dozen Payloads (Target: Denied)
1. Creating a report with another user's `userId`.
2. Updating a report to `status: 'resolved'` without being the assigned worker or admin.
3. Injecting a 2MB string into the `title` field.
4. Deleting a report by a non-owner/non-admin.
5. Updating the `createdAt` timestamp of an existing report.
6. Creating a report with an invalid category like `category: 'hack'`.
7. Listing users collection as an unauthenticated user.
8. Updating `role` in the user profile to `admin` via client SDK.
9. Creating a report with a document ID that is 2000 characters long.
10. Removing the `required` field `location` during an update.
11. Bypassing email verification (if mandated).
12. Updating a report in 'resolved' state.

## The Test Runner
A `firestore.rules.test.ts` will be generated to verify these boundaries.
