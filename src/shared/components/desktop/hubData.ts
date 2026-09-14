// Static marketing content for the desktop hub sections, ported verbatim
// from the `New design desktop/` reference (data.ts). Presentational only —
// no pricing math (the real app's premium comes from useQuoteSnapshot()).

export const BENEFITS = [
  {
    icon: "DollarSign",
    title: "Zero Broker Intermediary Fees",
    desc: "By stripping away local brokers and utilizing flat-fee operations, we pass 35-40% direct premium reductions back to the physicians we insure.",
  },
  {
    icon: "Zap",
    title: "Immediate COI Generation",
    desc: "Lock or buy your binder and obtain your official hospital-vetted Certificate of Insurance (COI) immediately. No more waiting 10 days for paperwork.",
  },
  {
    icon: "Network",
    title: "Full Interstate Portability",
    desc: "This policy belongs entirely to you, not your medical employer. Stay completely covered when relocating, moonlighting, or doing telehealth side-work.",
  },
  {
    icon: "RefreshCw",
    title: "Prior Acts Retroactive Matching",
    desc: "Change carriers with zero security anxiety. We match your original Claims-Made continuity date perfectly, erasing the need to purchase external tail.",
  },
];

export const COMPARISON_GRID = [
  {
    feature: "Direct Cost Savings",
    selectFirst: "Up to 35-40% lower premiums via direct direct-to-underwriter RRG channels.",
    traditionalBrokers: "Standard commercial rates with 10-15% broker commissions loaded.",
    employerGroup: "Included, but offsets taxable salary and strictly limits extra activity.",
  },
  {
    feature: "Individual Portability",
    selectFirst: "100% portable. Overlaps all medical setups, side gigs, and state-wide moves.",
    traditionalBrokers: "State-specific, requires complex commercial endorsements to transfer.",
    employerGroup: "Stops immediately upon leaving or changing jobs. Zero moonlighting coverage.",
  },
  {
    feature: "Time to Active Certificate",
    selectFirst: "Instant download. Bound in under 5 minutes with automatic hospital validation.",
    traditionalBrokers: "3 to 14 business days. Requires tedious paper-based signature bundles.",
    employerGroup: "Varies. Tied to HR administration times during clinical onboarding.",
  },
  {
    feature: "Tail Option Guidance",
    selectFirst: "Flexible prior acts matching and free retirement/disability tail options.",
    traditionalBrokers:
      "Rarely included. Relies on buying standalone tail policies starting at 200% base price.",
    employerGroup:
      "Often missing or capped. May leave you vulnerable if the health system restructures.",
  },
];

export const FAQ_DATA = [
  {
    id: "faq-1",
    question: "What is the structural difference between Claims-Made and Occurrence?",
    answer:
      "A Claims-Made policy covers incidents occurred AND reported while the policy remains actively in force. It requires “Tail” coverage if cancelled. An Occurrence policy covers incidents that occur during the policy period, regardless of when the lawsuit is eventually filed, meaning no tail coverage is ever required to protect that specific calendar window.",
  },
  {
    id: "faq-2",
    question: "How does an authorized Risk Retention Group benefit my clinical pricing?",
    answer:
      "Under the federal Liability Risk Retention Act (LRRA), a Risk Retention Group (RRG) is authorized to sell liability protection nationwide under the primary supervision of its chartering state. This cuts down complex state-by-state filing fees, enabling us to go direct-to-broker and pass down 35% in premium savings to our professional policyholders.",
  },
  {
    id: "faq-3",
    question: "Do you offer Retroactive Date Matching (Prior Acts) for changing insurers?",
    answer:
      "Absolutely. If you are active under a previous Claims-Made policy and can provide proof of continuous coverage, we will align your “Retroactive Date” perfectly with your new SelectFirst policy. This preserves and protects your historical coverage window without requiring you to purchase expensive tail coverage from your previous carrier.",
  },
  {
    id: "faq-4",
    question: "Is this coverage portable when I moonlight, change employers, or relocate?",
    answer:
      "Yes. Unlike hospital or employer-sponsored group policies—which ONLY cover you for actions taken on behalf of that specific employer—this is your personal policy. It belongs exclusively to you. It guarantees seamless portability as you change jobs, seek extra moonlighting shifts, or consult across state lines.",
  },
  {
    id: "faq-5",
    question: "What is Tail Coverage and is it automatically provided?",
    answer:
      "Tail coverage (Extended Reporting Endorsement) protects you for past incidents after a claims-made policy is canceled. SelectFirst offers dynamic free tail coverage endorsements upon your retirement (under specified premium duration requirements) or in the event of disability or death, giving your career maximum structural security.",
  },
];
