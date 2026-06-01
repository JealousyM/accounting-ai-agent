-- AlterTable: add tax deadline reminder preferences to telegram_links
ALTER TABLE "telegram_links" ADD COLUMN "reminderEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "telegram_links" ADD COLUMN "reminderLeadDays" INTEGER NOT NULL DEFAULT 3;
