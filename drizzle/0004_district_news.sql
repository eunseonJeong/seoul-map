CREATE TABLE "district_news" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "district_news_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"district_code" char(5) NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"url" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "district_news_district_url_key" UNIQUE("district_code","url")
);
--> statement-breakpoint
ALTER TABLE "district_news" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "district_news" ADD CONSTRAINT "district_news_district_code_district_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."district"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "district_news_district_published_idx" ON "district_news" USING btree ("district_code","published_at");