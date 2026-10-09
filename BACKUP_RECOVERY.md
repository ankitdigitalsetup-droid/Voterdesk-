# VoterDesk Database Backup & Recovery Guide

This guide details the procedures for backing up and restoring the VoterDesk production database (Neon Serverless PostgreSQL or Hostinger VPS PostgreSQL).

---

## 1. Automated Snapshot Backups

The application includes automated backup and restore utilities in `scripts/`:

### Creating a Database Backup
To create a complete JSON snapshot of all database tables (Candidates, Booths, Voters, Access Passwords, Team Profiles, and Users):
```bash
npm run backup
```
* **Output Location:** `backups/voterdesk_backup_YYYY-MM-DD_HH-mm-ss-SSSZ.json`
* **Contents:**
  - Candidates configuration & settings
  - All Booths & voter counts
  - All 11-field Voter records (Name, EPIC, Guardian, Age, Booth, Serial, Zila Parishad, Panchayat Samiti, Status, etc.)
  - Access Passwords
  - Karyakarta Team & GPS locations
  - User accounts

### Restoring a Database Backup
To restore the latest backup from the `backups/` directory:
```bash
npm run restore
```

To restore a specific backup file:
```bash
node scripts/restore.mjs backups/voterdesk_backup_2026-10-03T20-37-59-769Z.json
```
The restore script operates with idempotent `upsert` queries to prevent duplicate key errors and safely re-populates all foreign-key relationships.

---

## 2. Neon Point-in-Time Recovery (PITR) & Instant Branching

Neon Serverless PostgreSQL maintains continuous Write-Ahead Logs (WAL) for up to 30 days.

### Instant Zero-Downtime Rollback:
If accidental data deletion occurs:
1. Log in to [Neon Console](https://console.neon.tech).
2. Go to **Branches** > Click **New Branch**.
3. Select **Point in Time (PITR)**.
4. Specify the exact time (e.g. 5 minutes ago, before the incident).
5. Neon creates a new independent PostgreSQL branch in **~2 seconds**.
6. Update your `DATABASE_URL` in environment variables to point to the newly recovered branch endpoint.

---

## 3. Recommended Automated Backup Cron (Linux / VPS)

For production deployment on Hostinger VPS or Linux servers, add a daily automated backup via crontab:
```bash
# Run daily database backup at 2:00 AM
0 2 * * * cd /var/www/voterdesk && node scripts/backup.mjs >> /var/log/voterdesk_backup.log 2>&1
```
