import os
import sys
import shutil
import zipfile
from datetime import datetime, timedelta

def create_database_backup():
    """
    Automated Database Backup Utility.
    Creates timestamped database backups, compresses archives, and enforces 30-day retention policy.
    """
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backup_dir = os.path.join(root_dir, 'backups')

    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)

    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    backup_filename = f"citycare_db_backup_{timestamp}.zip"
    backup_path = os.path.join(backup_dir, backup_filename)

    db_file = os.path.join(root_dir, 'backend', 'hospital_pos.db')

    if os.path.exists(db_file):
        print(f"Creating database backup archive: {backup_path}...")
        with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(db_file, arcname='hospital_pos.db')
        print(f"✓ Backup created successfully: {os.path.basename(backup_path)}")
    else:
        print("Note: SQLite database file not found. If running MySQL, execute mysqldump dump procedure.")

    # Retention Policy Cleanup (purge backups older than 30 days)
    retention_days = 30
    now = datetime.utcnow()

    for fname in os.listdir(backup_dir):
        fpath = os.path.join(backup_dir, fname)
        if os.path.isfile(fpath) and fname.endswith('.zip'):
            file_time = datetime.fromtimestamp(os.path.getmtime(fpath))
            if (now - file_time).days > retention_days:
                print(f"Purging old backup archive per 30-day retention policy: {fname}")
                os.remove(fpath)

if __name__ == '__main__':
    create_database_backup()
