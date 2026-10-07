CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nickname" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "watchlist" DROP CONSTRAINT "watchlist_complex_area_key";--> statement-breakpoint
ALTER TABLE "region_feature" DROP CONSTRAINT "region_feature_pkey";--> statement-breakpoint
ALTER TABLE "region_feature" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "region_feature" ADD CONSTRAINT "region_feature_user_id_district_code_pk" PRIMARY KEY("user_id","district_code");--> statement-breakpoint
ALTER TABLE "region_feature" ADD COLUMN "summary" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "region_feature" ADD COLUMN "features" jsonb DEFAULT '{"transit":[],"school":[],"life":[],"development":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_note" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "watchlist" ADD COLUMN "user_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "app_user_nickname_key" ON "app_user" USING btree (lower("nickname"));--> statement-breakpoint
ALTER TABLE "region_feature" ADD CONSTRAINT "region_feature_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_note" ADD CONSTRAINT "visit_note_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "district" DROP COLUMN "summary";--> statement-breakpoint
ALTER TABLE "district" DROP COLUMN "features";--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_complex_area_key" UNIQUE("user_id","complex_id","area");