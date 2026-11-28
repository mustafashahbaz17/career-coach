// Helplines shown in the Vent space. ONE place to edit them.
//
// Only numbers that at least two recent sources agree on are listed (checked 28 Nov 2026):
//   - 1122: Rescue 1122 emergency service.
//   - 1166: national health helpline (Dawn, 8 Apr 2023 "Humraaz" launch; TherapyRoute Pakistan crisis list).
//   - 15 then 7: Punjab Safe City mental-health counselling (Express Tribune, Jan 2026; ProPakistani, 23 Jan 2026; APP 2026).
//   - Taskeen 0316-8275336, Mon–Sat 11 AM–11 PM (Express Tribune, Sep 2025; TherapyRoute).
// Numbers we left out because sources disagree: Umang (several different numbers online).
//
// TODO (data lead): call each number once to confirm it answers, and update `checked` below.
export const HELPLINES_CHECKED = '28 Nov 2026'

export type Helpline = { name: string; number: string; dial: string; note: string }

export const EMERGENCY: Helpline = { name: 'Rescue 1122', number: '1122', dial: '1122', note: 'If you or someone else is in immediate danger' }

export const HELPLINES: Helpline[] = [
  { name: 'Taskeen helpline', number: '0316-8275336', dial: '+923168275336', note: 'Mental health support, Mon–Sat, 11 AM–11 PM' },
  { name: 'National health helpline', number: '1166', dial: '1166', note: 'Free, nationwide' },
  { name: 'Punjab Safe City', number: '15, then press 7', dial: '15', note: 'Talk to a psychologist (Punjab)' },
]
