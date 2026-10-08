import { Oswald, Plus_Jakarta_Sans } from "next/font/google";

// Fight Club's own look (fightclub-us.com), used on everything people see at
// an event: the registration screen, the printout and the phone form. Staff
// screens inside the CRM keep the CRM's look.

export const oswald = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });
export const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

// The logo artwork's own navy (the site's is #001c28): matching it lets the
// logo sit on the background with no visible box around it.
export const NAVY = "#001524";
export const GOLD = "#c69a2d";
export const PHOTO_URL = "/event-registration/photo.jpg";
export const TAGLINE = "No One Fights Alone";

export const classOf = (year) => (year ? `Class of ${year}` : "");
