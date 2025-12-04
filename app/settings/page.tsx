import Image from "next/image";
import logo from "@/assets/discourse.svg";
import Link from "next/link";
import SettingsMenu from "@/components/SettingsMenu";
import NavTabs from "@/components/NavTabs";
import AccountSettingsForm from "@/components/AccountSettingsForm";
import { DatabaseStatusBadge } from "@/components/DatabaseStatusBadge";

export default function SettingsPage() {
  const navItems = [
    { key: 'home', label: 'Home', href: '/' },
    { key: 'channels', label: 'Channels', href: '/?view=channels' },
  ];

  return (
    <div className="bg-[#F0F0F0] dark:bg-neutral-950 bg-[url('https://www.transparenttextures.com/patterns/gplay.png')] dark:bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')] bg-repeat dark:bg-repeat flex min-h-screen flex-col justify-center">
      <div className="mx-auto flex w-full max-w-full md:max-w-md flex-1 flex-col sm:p-3 sm:px-5 md:px-0 lg:max-w-xl backdrop-blur-xs bg-white/50 dark:bg-black/30 dark:border-white">
        <header className="flex flex-col py-2 px-5">
          <div className="flex flex-row items-center gap-1 w-full">
            <div className="relative flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 md:w-16 md:h-16">
              <Image src={logo} alt="Discourse logo" fill sizes="(max-width: 640px) 48px, (max-width: 768px) 64px, 96px" className="object-contain" priority />
            </div>

            <h1 className="m-0text-[#3c3c3c] dark:text-[#D9D9D9] text-2xl sm:text-3xl font-semibold leading-none tracking-tighter md:text-3xl md:leading-none flex-1 min-w-0 truncate">DISCOURSE</h1>

            <div className="flex ml-auto">
              <SettingsMenu />
            </div>
          </div>
        </header>

        <main className="mt-2 flex flex-1 flex-col w-full ">
          <div className="border-b border-gray-700 dark:border-neutral-800  flex items-center justify-between dark:text-neutral-200 px-4">
            <div className="flex md:items-center lg:items-center ">
              <NavTabs items={navItems} defaultKey={'home'} />
            </div>
            <div className="flex px-.5 ml-auto">
              <SettingsMenu />
            </div>
          </div>

          <div className="px-4 flex-1 bg-white/50 dark:bg-black/30">
            <AccountSettingsForm />
          </div>
        </main>

        <hr className="border-t border-gray-700 dark:border-neutral-800 " />

        <footer className="p-5 pb-0 flex flex-col sm:flex-row items-start justify-between sm:gap-6">
          <div className="text-sm text-[#61646B] dark:text-[#94979E] flex-1">
            About <Link href="https://nextjs.org" target="_blank" className="text-[#00684A] dark:text-[#00ED64] hover:underline">Next.js</Link> and the native <Link href="https://www.mongodb.com/" target="_blank" className="text-[#00684A] dark:text-[#00ED64] hover:underline">MongoDB</Link> integration.
          </div>
          <DatabaseStatusBadge />
        </footer>
      </div>
    </div>
  );
}
