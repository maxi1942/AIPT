import ProfileForm from "@/components/ProfileForm";
import { getDb } from "@/lib/db";
import type { UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const db = getDb();
  const profile =
    (db.prepare("SELECT * FROM user_profile WHERE id = 1").get() as
      | UserProfile
      | undefined) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your profile</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tell AIPT about yourself — it generates your weekly plan and tunes
          the AI trainer&apos;s coaching. You can change everything later.
        </p>
      </div>
      <ProfileForm initial={profile} />
    </div>
  );
}
