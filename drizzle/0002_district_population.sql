ALTER TABLE "district" ALTER COLUMN "population" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "district" ADD COLUMN "population_month" char(7);