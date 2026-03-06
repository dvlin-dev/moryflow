DELETE FROM "SyncFile"
WHERE "storageRevision" IS NULL;

ALTER TABLE "SyncFile"
ALTER COLUMN "storageRevision" SET NOT NULL;
