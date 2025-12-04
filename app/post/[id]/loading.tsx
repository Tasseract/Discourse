export default function Loading() {
  return (
    <div className="bg-[#F0F0F0] dark:bg-neutral-950 bg-[url('https://www.transparenttextures.com/patterns/gplay.png')] dark:bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')] bg-repeat dark:bg-repeat flex min-h-screen flex-col justify-center">
      <div className="mx-auto flex w-full max-w-full md:max-w-md flex-1 flex-col sm:p-3 sm:px-5 md:px-0 lg:max-w-xl backdrop-blur-xs bg-white/50 dark:bg-black/30 dark:border-white">
        <main className="mt-2 flex flex-1 flex-col w-full">
          <div className="px-4 flex-1">
            <div className="max-w-3xl mx-auto p-6">
              <div className="w-full space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-800 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-neutral-800 rounded w-1/3 animate-pulse" />
                    <div className="h-3 bg-gray-200 dark:bg-neutral-800 rounded w-1/4 mt-2 animate-pulse" />
                  </div>
                </div>

                <div className="h-56 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse" />

                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-neutral-800 rounded w-full animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-neutral-800 rounded w-5/6 animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-neutral-800 rounded w-2/3 animate-pulse" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="h-8 w-32 bg-gray-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                  <div className="h-8 w-20 bg-gray-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
