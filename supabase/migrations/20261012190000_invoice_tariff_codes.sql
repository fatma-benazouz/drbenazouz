-- =============================================================================
-- Tariff codes on invoice lines.
--
-- Medical schemes need both the tariff (procedure) code - e.g. 0190/0191 for a
-- GP consultation - and the ICD-10 (diagnosis) code on every claim. Until now
-- invoice lines only had an ICD-10 field.
--
-- Additive and safe to run more than once. Runs as one transaction.
-- =============================================================================

BEGIN;

ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS tariff_code text;

-- Some imported lines hold a tariff code in the ICD-10 field (e.g. "0190").
-- ICD-10 codes always start with a letter, so a purely numeric 4-digit value
-- can only be a tariff code: move it across.
UPDATE public.invoice_items
   SET tariff_code = icd10_code,
       icd10_code  = NULL
 WHERE tariff_code IS NULL
   AND icd10_code ~ '^[0-9]{4}$';

-- INV-0012 was imported with its tariff code (0191) in the invoice note.
UPDATE public.invoice_items it
   SET tariff_code = '0191'
  FROM public.invoices i
 WHERE i.id = it.invoice_id
   AND i.invoice_number = 'INV-0012'
   AND it.tariff_code IS NULL;

COMMIT;
