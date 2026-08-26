// The waiver wording, in one place.
//
// The signing page, the generated PDF and the request email all read from here,
// so the text a signer agrees to on screen is byte-for-byte the text stored in
// their signed document. Editing the wording means editing this file only.
//
// Keep it plain ASCII — the PDF fonts are standard ones and curly quotes are a
// needless risk there.

export const WAIVER_TITLE =
  "Fight Club Participant Liability Waiver & Photo/Name Release Form";

// Shown under the title on the signing page.
export const WAIVER_SUBTITLE = "Liability Waiver & Photo/Name Release";

export const WAIVER_SECTIONS = [
  {
    key: "liability",
    heading: "Waiver and Release of Liability",
    paragraphs: [
      "I, the undersigned Fight Club participant, or parent or legal guardian of the Fight Club participant below, understand that participation in Fight Club Events and associated activities involves physical activity and inherent risks, including but not limited to the risk of injury.",
      "I voluntarily assume all risks associated with my or my child's participation in Fight Club events and agree to release, waive, and hold harmless Fight Club employees, agents, and any other affiliated individuals or entities from any and all claims, liability, demands, actions, or causes of action arising out of any injury, loss, or damage that may occur during or as a result of participation in Fight Club.",
      "I certify that I am or the child listed below is physically fit and able to participate, and I understand that medical insurance is my responsibility.",
    ],
    choices: [
      {
        value: "release",
        emphasis: "I release",
        rest: " Fight Club from liability for damages resulting from participation in Club events.",
      },
      {
        value: "do_not_release",
        emphasis: "I DO NOT release",
        rest: " Fight Club from liability for damages resulting from participation in Club events.",
      },
    ],
  },
  {
    key: "photo",
    heading: "Photo/Name Release",
    paragraphs: [
      "I grant permission to Fight Club employees, agents, and affiliated media to use photographs, video recordings, or other images of me or my child taken during Fight Club events for promotional, marketing, social media, and/or other news purposes.",
      "I also grant permission to Fight Club to use my or my child's name in promotional, marketing, social media, and/or news purposes.",
      "I understand that my or my child's name or images may be used without further notice, compensation, or approval, and may appear in printed materials, online, or other media formats.",
      "By signing below, each parent/guardian acknowledges that they have read and understand this Liability Waiver and Photo/Name Release and agree to its terms.",
    ],
    choices: [
      {
        value: "allow",
        emphasis: "I give permission",
        rest: " to Fight Club to use both my or my child's photo and name.",
      },
      {
        value: "do_not_allow",
        emphasis: "I DO NOT give permission",
        rest: " to Fight Club to use my or my child's photo or name.",
      },
    ],
  },
];

// The form no longer assumes a parent is signing — an adult participant may
// sign for themselves.
export const PARTICIPANT_NAME_LABEL = "Participant Name";
export const SIGNER_NAME_LABEL = "Participant or Parent/Guardian Name";
export const SIGNATURE_LABEL = "Participant or Parent/Guardian Signature";

const section = (key) => WAIVER_SECTIONS.find((s) => s.key === key);

// The full sentence for a chosen option, used when writing it into the PDF.
export function choiceText(sectionKey, value) {
  const found = section(sectionKey)?.choices.find((c) => c.value === value);
  return found ? `${found.emphasis}${found.rest}` : "";
}
