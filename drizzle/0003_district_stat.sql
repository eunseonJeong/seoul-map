CREATE TABLE "district_stat" (
	"district_code" char(5) PRIMARY KEY NOT NULL,
	"subway_stations" integer,
	"subway_lines" jsonb,
	"elementary_schools" integer,
	"middle_schools" integer,
	"high_schools" integer,
	"academies" integer,
	"tutoring_centers" integer,
	"exam_academies" integer,
	"transit_updated_at" timestamp with time zone,
	"school_updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "district_stat" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "district_stat" ADD CONSTRAINT "district_stat_district_code_district_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."district"("code") ON DELETE cascade ON UPDATE no action;