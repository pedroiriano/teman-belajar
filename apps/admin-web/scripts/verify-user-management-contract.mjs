import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const actions = await readFile(new URL("../src/app/actions/users.ts", import.meta.url), "utf8");
const detailPage = await readFile(new URL("../src/app/dashboard/users/[id]/page.tsx", import.meta.url), "utf8");

assert.match(actions, /export async function updateUserProfileAction/);
assert.match(actions, /revalidatePath\(`\/dashboard\/users\/\$\{userId\}`\)/);
assert.match(actions, /revalidatePath\("\/dashboard\/users"\)/);
assert.match(detailPage, /<form action=\{updateProfile\}>/);
assert.match(detailPage, /name="firstName"/);
assert.match(detailPage, /name="lastName"/);
assert.match(detailPage, /name="email"/);

console.log("User Management edit and post-mutation refresh contract verified.");
