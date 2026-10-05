CREATE TABLE "ingest_log" (
	"district_code" char(5) NOT NULL,
	"month" char(7) NOT NULL,
	"deal_type" "deal_type" NOT NULL,
	"row_count" integer NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingest_log_district_code_month_deal_type_pk" PRIMARY KEY("district_code","month","deal_type")
);
--> statement-breakpoint
ALTER TABLE "ingest_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "complex" ALTER COLUMN "built_year" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "complex" ALTER COLUMN "households" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "complex" ALTER COLUMN "lat" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "complex" ALTER COLUMN "lng" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "district_monthly" ALTER COLUMN "sale" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "district_monthly" ALTER COLUMN "jeonse" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "district_monthly" ADD COLUMN "sale_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "district_monthly" ADD COLUMN "jeonse_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "trade" ADD COLUMN "is_renewal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ingest_log" ADD CONSTRAINT "ingest_log_district_code_district_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."district"("code") ON DELETE cascade ON UPDATE no action;