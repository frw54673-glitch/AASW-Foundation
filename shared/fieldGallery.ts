export type FieldGalleryItem = {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  quarter: string;
  alt: string;
};

// These are the approved visual records audited from the official AASW Foundation website.
// Future Google Drive sync will add records using the same shape after folder credentials are configured.
export const CURATED_FIELD_GALLERY: FieldGalleryItem[] = [
  {
    id: "aasw-field-session",
    imageUrl: "/manus-storage/aasw-field-session_43c9b878.jpeg",
    title: "Women’s empowerment field session",
    description: "A learning session from AASW Foundation’s women empowerment work.",
    quarter: "Foundation field record",
    alt: "Women taking part in an AASW capability-building field session",
  },
  {
    id: "aasw-women-learning",
    imageUrl: "/manus-storage/aasw-women-learning_f22d8267.jpeg",
    title: "Women’s learning event",
    description: "Participants gathered for an AASW women empowerment and learning event in Uttar Pradesh.",
    quarter: "Foundation field record",
    alt: "Women gathered at an AASW learning event in Uttar Pradesh",
  },
  {
    id: "aasw-digital-skills",
    imageUrl: "/manus-storage/aasw-digital-skills_2dde7820.jpeg",
    title: "Digital skills training",
    description: "A digital skills training session for women in Uttar Pradesh.",
    quarter: "Foundation field record",
    alt: "AASW digital skills training session for women in Uttar Pradesh",
  },
  {
    id: "aasw-green-workshop",
    imageUrl: "/manus-storage/aasw-green-workshop_8f06b6fa.jpeg",
    title: "Green business workshop",
    description: "Women entrepreneurs participating in an AASW green business workshop.",
    quarter: "Foundation field record",
    alt: "Women entrepreneurs at an AASW green business workshop",
  },
  {
    id: "aasw-community-mentorship",
    imageUrl: "/manus-storage/aasw-community-mentorship_ffb5bf0b.jpeg",
    title: "Community and mentorship",
    description: "AASW’s community gathering and mentorship session.",
    quarter: "Foundation field record",
    alt: "AASW community gathering and mentorship session",
  },
];
