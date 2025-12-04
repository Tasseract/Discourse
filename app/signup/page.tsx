import Image from "next/image"
import Link from "next/link"
import logo from "@/assets/discourse.svg"

import { AuthForm } from "@/components/auth-form"

export default function SignupPage() {
  return (
    <div className="relative bg-[#F0F0F0] dark:bg-neutral-950 bg-[url('https://www.transparenttextures.com/patterns/gplay.png')] dark:bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')] bg-repeat dark:bg-repeat min-h-screen flex items-center justify-center">
      <div className="relative z-10 mx-auto w-full max-w-md p-6 backdrop-blur-xs bg-white/50 dark:bg-black/30 rounded-lg">
        <header className="flex items-center justify-center mb-6">
          <Link href="/" className="flex items-center justify-center">
            <div className="relative w-40 h-14">
              <Image src={logo} alt="DISCOURSE logo" fill className="object-contain" priority />
            </div>
          </Link>
        </header>

        <main>
          <AuthForm mode="signup" />
        </main>
      </div>
    </div>
  )
}