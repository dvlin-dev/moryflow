DROP TABLE IF EXISTS "VectorizedFile";

ALTER TABLE "UserStorageUsage"
DROP COLUMN IF EXISTS "vectorizedCount";
