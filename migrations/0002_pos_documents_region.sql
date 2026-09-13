-- Proveedor regional: región asociada al documento generado en el POS.
ALTER TABLE "pos_documents" ADD COLUMN IF NOT EXISTS "region" varchar(100);
