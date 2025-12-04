import Image from "next/image";
import logo from "@/assets/discourse.svg";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import BackButton from "@/components/BackButton";
import EditProfile from "@/components/EditProfile";
import ActionHistory from "@/components/ActionHistory";
import { getDatabase } from "@/lib/mongodb";
import { resolveRoleFromSession } from '@/lib/getRole';

export default async function AccountPage() {
  let session: any = null;
  try {
    const auth = await getAuth();
    const s = await auth.api.getSession({ headers: await headers() });
    session = s?.user ? s : null;
  } catch (e) {
    // ignore and render fallback
  }

  const name = session?.user?.name ?? 'Not signed in';
  const email = session?.user?.email ?? 'Not signed in';
  let role = 'guest';
  if (session) {
    try {
      const resolved = await resolveRoleFromSession(session);
      role = resolved ?? 'member';
    } catch (e) {
      role = session?.user?.role ?? 'member';
    }
  }

  let profile: any = null;
  if (session?.user?.id) {
    try {
      const db = await getDatabase();
      const raw = await db.collection('profiles').findOne({ userId: session.user.id });
      if (raw) {
        // Convert Mongo types to plain JS values safe to pass to client components
        profile = {
          _id: raw._id && raw._id.toString ? raw._id.toString() : raw._id,
          userId: raw.userId,
          name: raw.name,
          description: raw.description,
          profilePicUrl: raw.profilePicUrl,
          bgClass: raw.bgClass,
          createdAt: raw.createdAt ? (raw.createdAt.toISOString ? raw.createdAt.toISOString() : String(raw.createdAt)) : undefined,
          updatedAt: raw.updatedAt ? (raw.updatedAt.toISOString ? raw.updatedAt.toISOString() : String(raw.updatedAt)) : undefined,
        };
      }
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="bg-[#F0F0F0] dark:bg-neutral-950 bg-[url('https://www.transparenttextures.com/patterns/gplay.png')] dark:bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')] bg-repeat dark:bg-repeat flex min-h-screen flex-col justify-center">
      <div className="mx-auto flex w-full max-w-full md:max-w-md flex-1 flex-col sm:p-3 sm:px-5 md:px-0 lg:max-w-xl backdrop-blur-xs bg-white/40 dark:bg-black/20 dark:border-white">
        <header className="flex items-center gap-3 py-3 px-4">
          <div className="relative flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 md:w-16 md:h-16">
                <Image
                  src={logo}
                  alt="Discourse logo"
                  fill
                  sizes="(max-width: 640px) 48px, (max-width: 768px) 64px, 96px"
                  className="object-contain"
                  priority
                />
              </div>
          <div>
            <h2 className="m-0 text-lg font-semibold dark:text-white">Account Settings</h2>
            <div className="text-xs text-gray-500">Manage your profile and preferences</div>
          </div>
          <div className="ml-auto">
            <BackButton />
          </div>
        </header>

        <main className="px-4 py-4">
          <div className="rounded-md border border-gray-100 dark:border-neutral-800 p-4 bg-white/60 dark:bg-black/10">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <EditProfile initial={profile ?? { name }} />
              </div>
              
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Name</div>
                <div className="font-medium mb-1">{profile?.name ?? name}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Email</div>
                <div className="font-medium mb-1">{email}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Role</div>
                <div className="font-medium mb-1 capitalize">{role}</div>
              </div>

              

              <div>
                <ActionHistory />
              </div>

              <div className="text-xs text-gray-500 mt-2">This page is intentionally low-profile; use the header buttons for actions.</div>
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
