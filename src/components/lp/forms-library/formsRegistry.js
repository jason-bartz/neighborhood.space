// Registry of forms exposed to chapter directors in the LP portal Resources tab.
// Each form has a public route (FormsLibrary admin UI sends/links to it) and a
// matching record in /formLibrarySubmissions when filled out.
export const FORMS = [
  {
    id: 'lp-onboarding',
    title: 'LP Onboarding Form',
    summary:
      'Collect headshot, bio, committee preferences, and required agreements from a new Limited Partner.',
    description:
      "Send this to a new LP after they've been approved. Captures the headshot and bio for their public chapter profile, surfaces committee interests, gathers an optional address and shirt size for the surprise list, and gets the Volunteer Agreement and Non-Disclosure Agreement signed in one go.",
    category: 'Onboarding',
    number: 'F1',
    accent: 'grape',
    publicPath: '/forms/lp-onboarding',
    inviteSubject: 'Welcome to Good Neighbor Fund — please complete your LP onboarding',
    inviteIntro: ({ chapter }) =>
      `Welcome to the Good Neighbor Fund ${chapter || ''} chapter! Before our next gathering, please take a few minutes to complete your LP onboarding. It captures the headshot and bio for your public chapter profile and gets the Volunteer Agreement and NDA on file.`.replace(/  +/g, ' '),
    estTime: '8 minutes',
  },
  {
    id: 'microgrant-awardee',
    title: 'Microgrant Awardee Form',
    summary:
      "Collect a grant winner's mailing address, social handles, and announcement photo.",
    description:
      "Send this to a microgrant winner after the chapter has decided. Captures the exact name to print on the check, the mailing address to send it to, social handles to tag in the announcement post, and a photo for the social media announcement.",
    category: 'Grants',
    number: 'F2',
    accent: 'aqua',
    publicPath: '/forms/microgrant-awardee',
    inviteSubject: 'Your Good Neighbor Fund grant — final details',
    inviteIntro: ({ chapter }) =>
      `Congratulations on your Good Neighbor Fund grant from the ${chapter || ''} chapter. Before we mail the check and put together the announcement, we need a few quick details from you.`.replace(/  +/g, ' '),
    estTime: '4 minutes',
  },
];

export function getFormById(id) {
  return FORMS.find((f) => f.id === id) || null;
}

// Slug helpers used by the admin "copy link" UI to pre-populate ?chapter= on
// the public form URL. Mirrors the fallbacks used in the form pages themselves.
export const FALLBACK_CHAPTER_NAME_TO_SLUG = {
  'Western New York': 'wny',
  'Denver': 'denver',
  'Central New York': 'upstate',
  'Capital Region': 'capital-region',
};
