import { screenContent } from '../src/lib/content-moderation';

const shouldPass = [
  'Please pray for my mother who is in hospital after surgery.',
  'My brother attempted suicide last week. Please pray for our family.',
  'Pray for healing from cancer and for peace in our home.',
  'I am struggling with anxiety and depression. Please pray.',
  'Praying for the Scunthorpe mission team and the assassination of my pride.',
  'Pray for my classmate Sitt and our analysis exam.',
  'Our church needs a bigger bus. Please pray for provision.',
  'Please pray for my marriage and for my husband to find work.',
];

const shouldFail = [
  'You are a stupid bitch',
  'F.U.C.K this church',
  'sh1t happens',
  'go kill yourself',
  'this is p0rn',
  'f u c k off',
  'You retard, leave',
];

let failures = 0;

for (const text of shouldPass) {
  const result = screenContent('Prayer', text);
  if (!result.ok) {
    failures++;
    console.log(`FALSE POSITIVE: "${text}" -> ${result.matches?.join(', ')}`);
  }
}

for (const text of shouldFail) {
  const result = screenContent('Prayer', text);
  if (result.ok) {
    failures++;
    console.log(`MISSED: "${text}"`);
  }
}

console.log(
  failures === 0
    ? `OK: ${shouldPass.length} legitimate passed, ${shouldFail.length} objectionable blocked.`
    : `${failures} failing case(s).`,
);
process.exit(failures === 0 ? 0 : 1);
