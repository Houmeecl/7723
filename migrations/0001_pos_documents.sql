-- POS-generated documents (agent generates a document for a client, keyed by RUT).
CREATE TABLE IF NOT EXISTS "pos_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer,
	"partner_username" varchar(255),
	"document_type_id" varchar(100) NOT NULL,
	"document_type_name" varchar(255) NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"client_rut" varchar(50) NOT NULL,
	"client_phone" varchar(50),
	"client_email" varchar(255),
	"verification_code" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'generated' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"commission" integer DEFAULT 0 NOT NULL,
	"pdf_path" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "pos_documents_verification_code_unique" UNIQUE("verification_code")
);
