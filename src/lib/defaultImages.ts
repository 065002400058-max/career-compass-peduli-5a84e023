// Default header images for events and scholarships (Lovable CDN assets).
// These are used as fallbacks when no custom image_url is set.

import eventCareerFair from "@/assets/event-career-fair.jpg.asset.json";
import eventCompanyTalk from "@/assets/event-company-talk.jpg.asset.json";
import eventSeminar from "@/assets/event-seminar.jpg.asset.json";
import eventWorkshop from "@/assets/event-workshop.jpg.asset.json";
import scholarshipAbroad from "@/assets/scholarship-abroad.jpg.asset.json";
import scholarshipDomestic from "@/assets/scholarship-domestic.jpg.asset.json";

export const eventImages: Record<string, string> = {
  "Career Fair": eventCareerFair.url,
  "Company Talk": eventCompanyTalk.url,
  Seminar: eventSeminar.url,
  Workshop: eventWorkshop.url,
};

export const scholarshipImages = {
  domestic: scholarshipDomestic.url,
  abroad: scholarshipAbroad.url,
};
