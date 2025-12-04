import Image from "next/image";
import logo from "@/assets/discourse.svg";
import { DatabaseStatusBadge } from "@/components/DatabaseStatusBadge";
import { AuthButton } from "@/components/AuthButton";
import SettingsMenu from "@/components/SettingsMenu";
import NavTabs from "@/components/NavTabs";
import { PostSection } from "@/components/PostSection";
import LivePostRefresher from "@/components/LivePostRefresher";
import ChannelsList from "@/components/ChannelsList";
import SearchBar from "@/components/SearchBar";
import PostSubmitButton from "@/components/PostSubmitButton";
import { getDatabase } from '@/lib/mongodb';
import { getAuth } from '@/lib/auth';
import { headers } from 'next/headers';
import { canViewChannel } from '@/lib/channelAccess';
const DATA = {
  title: "DISCOURSE",
  description:
    "A full-stack React template with Next.js, Vercel, and MongoDB. Ships with forum and auth, or strip it all out.",
  buttons: {
    primary: {
      className: "rounded-full bg-[#00ED64] px-5 py-2.5 font-semibold tracking-tight text-[#001E2B] transition-colors duration-200 hover:bg-[#58C860] lg:px-7 lg:py-3"
    },
    ghost: {
      className: "group flex items-center gap-2 leading-none tracking-tight dark:hover:bg-white/10 hover:bg-black/5 dark:hover:text-white hover:text-black"
    }
  },
  
};

interface HomeProps {
  searchParams: Promise<{ page?: string; channel?: string; view?: string; q?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = parseInt(resolvedSearchParams.page || '1', 10);
  const channelId = resolvedSearchParams.channel || null;
  const view = resolvedSearchParams.view || null;
  const q = resolvedSearchParams.q || undefined;
  const sort = (resolvedSearchParams as { sort?: string }).sort || undefined;

  // resolve channel name when viewing a specific channel so we can render
  // a desktop-only semi-transparent label on the page
  let channelName: string | null = null;
  let channelDescription: string | null = null;
  let canView = true;
  if (channelId) {
    try {
      const db = await getDatabase();
      const { ObjectId } = await import('mongodb');
      const ch = await db.collection('channels').findOne({ _id: new ObjectId(channelId) });
      channelName = ch?.name ?? null;
      channelDescription = ch?.description ?? null;
      try {
        const auth = await getAuth();
        const session = await auth.api.getSession({ headers: await headers() });
        const allowed = await canViewChannel(ch, session);
          if (!allowed) canView = false;
      } catch (e) {
        canView = false;
      }
    } catch (e) {
      channelName = null;
    }
  }

  const navItems = [
    { key: 'home', label: 'Home', href: '/' },
    { key: 'news', label: 'News', href: '/?channel=news' },
    { key: 'channels', label: 'Channels', href: '/?view=channels' },
  ];

  return (
  <div className="relative bg-[#F0F0F0] dark:bg-neutral-950 bg-[url('https://www.transparenttextures.com/patterns/gplay.png')] dark:bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')] bg-repeat dark:bg-repeat flex min-h-screen flex-col justify-center">
    {channelName && (
      <div className="hidden md:block pointer-events-none absolute top-3 left-3 z-0 bg-transparent opacity-10 select-none">
        <div className="text-7xl font-extrabold italic uppercase tracking-wide text-gray-200 dark:text-slate-200">{channelName}• </div>
        {channelDescription && (
          <div className="ml-5 max-w-xs text-lg uppercase italic text-gray-200 dark:text-slate-200">{channelDescription}</div>
        )}
      </div>
    )}
  <div className="relative z-10 mx-auto flex w-full max-w-full md:max-w-md flex-1 flex-col sm:p-3 sm:px-5 md:px-0 lg:max-w-xl backdrop-blur-xs bg-white/50 dark:bg-black/30 dark:border-white">
          <header className="flex flex-col py-2 px-5">
            <div className="flex flex-row items-center gap-1 w-full">
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

              <h1 className="m-0 text-[#3c3c3c] dark:text-[#D9D9D9] text-2xl sm:text-3xl font-semibold leading-none tracking-tighter md:text-3xl md:leading-none flex-1 min-w-0 truncate">
                {DATA.title}
              </h1>

              <div className="flex ml-auto">
                <AuthButton className={DATA.buttons.primary.className} />
              </div>
            </div>
          </header>

          <main className="mt-2 flex flex-1 flex-col w-full ">
            <div className="border-b border-gray-700 dark:border-neutral-800  flex items-center justify-between dark:text-neutral-200 px-4">
              {/* Navigation bar */}
              <div className="flex md:items-center lg:items-center ">
                <NavTabs items={navItems} defaultKey={view === 'channels' ? 'channels' : 'home'} />
                {/* <ChannelSelect /> TODO feature not implemented */}
              </div>
              <div className="flex px-0.5 ml-auto">
                <SettingsMenu />
              </div>
            </div>

            {/* Search and submit area below the nav bar */}
            <div className="flex items-center px-4 py-2 border-b border-gray-100 dark:border-neutral-800">
              <div className="mx-auto w-full flex gap-2">
                <SearchBar />
                <PostSubmitButton />
              </div>
            </div>

            <div className="px-4 flex-1 bg-white/50 dark:bg-black/30 pb-4">
              {view === 'channels' ? (
                <ChannelsList />
              ) : (
                <>
                  <LivePostRefresher intervalMs={10000} />
                  {channelId && !canView ? (
                    <div className="text-center py-8 text-gray-400">This channel is private. Join the channel to view posts.</div>
                  ) : (
                    <PostSection currentPage={currentPage} channelId={channelId} q={q} sort={sort} />
                  )}
                </>
              )}
            </div>
          </main>

          <hr className="border-t border-gray-700 dark:border-neutral-800 " />

          <footer className="p-5 pb-0 flex flex-col sm:flex-row items-start justify-between sm:gap-6">
            <div className="text-sm text-[#61646B] dark:text-[#94979E] flex-1" />
            <DatabaseStatusBadge />
          </footer>
      </div>
    </div>
  );
}
