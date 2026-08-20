-- Tambahkan kolom gambar pada event dan beasiswa
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.events.image_url IS 'URL gambar/header event';
COMMENT ON COLUMN public.scholarships.image_url IS 'URL gambar/header beasiswa';

-- Isi gambar default untuk event berdasarkan tipe
UPDATE public.events
SET image_url = CASE type
  WHEN 'Career Fair' THEN '/__l5e/assets-v1/1330df20-0c32-41ab-ba69-7f64379fe642/event-career-fair.jpg'
  WHEN 'Company Talk' THEN '/__l5e/assets-v1/bb01e84f-5bb9-49bf-81fd-683e599c95fb/event-company-talk.jpg'
  WHEN 'Seminar' THEN '/__l5e/assets-v1/819d941c-aad3-4171-a564-8012a6ba1d2c/event-seminar.jpg'
  WHEN 'Workshop' THEN '/__l5e/assets-v1/29bdf01f-70c8-4796-875e-f0d97d75fe5d/event-workshop.jpg'
  ELSE '/__l5e/assets-v1/819d941c-aad3-4171-a564-8012a6ba1d2c/event-seminar.jpg'
END
WHERE image_url IS NULL OR image_url = '';

-- Isi gambar default untuk beasiswa berdasarkan negara
UPDATE public.scholarships
SET image_url = CASE
  WHEN country = 'Indonesia' THEN '/__l5e/assets-v1/0465415d-9e05-4a90-9982-823c204cacea/scholarship-domestic.jpg'
  ELSE '/__l5e/assets-v1/6b0c5a47-7ef4-4144-a223-d7f8e21fe4a6/scholarship-abroad.jpg'
END
WHERE image_url IS NULL OR image_url = '';