CREATE TYPE "public"."deal_type" AS ENUM('sale', 'jeonse');--> statement-breakpoint
CREATE TABLE "complex" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"district_code" char(5) NOT NULL,
	"dong" text NOT NULL,
	"address" text NOT NULL,
	"built_year" smallint NOT NULL,
	"households" integer NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL
);
--> statement-breakpoint
ALTER TABLE "complex" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "complex_area" (
	"complex_id" text NOT NULL,
	"area" numeric(6, 2) NOT NULL,
	CONSTRAINT "complex_area_complex_id_area_pk" PRIMARY KEY("complex_id","area")
);
--> statement-breakpoint
ALTER TABLE "complex_area" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "district" (
	"code" char(5) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_eng" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"population" integer NOT NULL,
	"features" jsonb NOT NULL,
	"weekly_change" numeric(6, 2),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "district" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "district_monthly" (
	"district_code" char(5) NOT NULL,
	"month" char(7) NOT NULL,
	"sale" integer NOT NULL,
	"jeonse" integer NOT NULL,
	CONSTRAINT "district_monthly_district_code_month_pk" PRIMARY KEY("district_code","month")
);
--> statement-breakpoint
ALTER TABLE "district_monthly" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "region_feature" (
	"district_code" char(5) PRIMARY KEY NOT NULL,
	"memo" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "region_feature" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trade" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trade_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"complex_id" text NOT NULL,
	"deal_type" "deal_type" NOT NULL,
	"area" numeric(6, 2) NOT NULL,
	"floor" smallint NOT NULL,
	"price" integer NOT NULL,
	"contract_date" date NOT NULL,
	"is_cancelled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trade" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "unlock_attempt" (
	"client_key" text PRIMARY KEY NOT NULL,
	"fails" smallint DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unlock_attempt" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "visit_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_date" date NOT NULL,
	"complex_id" text,
	"complex_name" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"area" numeric(6, 2),
	"asking_price" integer,
	"deal_price" integer,
	"walk_minutes" smallint,
	"orientation" text DEFAULT '' NOT NULL,
	"parking" text DEFAULT '' NOT NULL,
	"maintenance" text DEFAULT '' NOT NULL,
	"surroundings" text DEFAULT '' NOT NULL,
	"pros" text DEFAULT '' NOT NULL,
	"cons" text DEFAULT '' NOT NULL,
	"rating" smallint NOT NULL,
	"memo" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visit_note_rating_check" CHECK ("visit_note"."rating" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "visit_note" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complex_id" text NOT NULL,
	"area" numeric(6, 2) NOT NULL,
	"base_sale_price" integer,
	"base_jeonse_price" integer,
	"base_date" date NOT NULL,
	"memo" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_complex_area_key" UNIQUE("complex_id","area")
);
--> statement-breakpoint
ALTER TABLE "watchlist" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "complex" ADD CONSTRAINT "complex_district_code_district_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."district"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complex_area" ADD CONSTRAINT "complex_area_complex_id_complex_id_fk" FOREIGN KEY ("complex_id") REFERENCES "public"."complex"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "district_monthly" ADD CONSTRAINT "district_monthly_district_code_district_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."district"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "region_feature" ADD CONSTRAINT "region_feature_district_code_district_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."district"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade" ADD CONSTRAINT "trade_complex_id_complex_id_fk" FOREIGN KEY ("complex_id") REFERENCES "public"."complex"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_note" ADD CONSTRAINT "visit_note_complex_id_complex_id_fk" FOREIGN KEY ("complex_id") REFERENCES "public"."complex"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_complex_id_complex_id_fk" FOREIGN KEY ("complex_id") REFERENCES "public"."complex"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complex_district_idx" ON "complex" USING btree ("district_code");--> statement-breakpoint
CREATE INDEX "trade_complex_area_date_idx" ON "trade" USING btree ("complex_id","area","contract_date");--> statement-breakpoint
CREATE INDEX "visit_note_visit_date_idx" ON "visit_note" USING btree ("visit_date");