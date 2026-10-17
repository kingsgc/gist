/** Nigerian states + hot topics used for localized content tagging. */

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

export type NigerianState = (typeof NIGERIAN_STATES)[number];

/** Trending banter topics — the tags that drive discovery. */
export const HOT_TOPICS = [
  "jollof-wars",
  "lagos-traffic",
  "danfo-diaries",
  "japa",
  "naira-vs-dollar",
  "aso-ebi-drama",
  "nollywood",
  "asuu",
  "barber-window",
  "naija-twitter",
] as const;

/** Short, punchy welcome copy shown on the feed header. */
export const APP_TAGLINE = "Anonymous gist for Naija 🇳🇬";
