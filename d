[33m8c54aba[m[33m ([m[1;36mHEAD[m[33m -> [m[1;32mmain[m[33m)[m chore: ignore private credentials
[33m04df433[m feat: add ConfirmModal and improved delete UX
[33m083cb00[m chore: ignore private credential file
[33mb346fbc[m Merge pull request #5 from dvoytenko/dima/remove-dev-client
[33me68ea87[m get rid of clientPromise
[33m1606154[m Remove DEV workarounds for client connection
[33m24c2353[m fix: ensure active pagination link has correct text color
[33m3604673[m refactor: remove spinner from loading state in AuthButton component
[33m3004a55[m Decrease maxIdleTimeMS to 5000
[33m8e5fa96[m Update demo link in README.md
[33m253fa87[m refactor: improve layout and styling in PostItem component for better readability
[33mb9939f0[m fix: add maxIdleTimeMS option for MongoClient configuration
[33ma810c6c[m refactor: enhance base URL retrieval logic for better deployment support
[33mb91bf91[m refactor: replace inline baseURL logic with getClientBaseURL function for improved clarity
[33m909b0c1[m refactor: simplify baseURL logic in authClient by removing getClientBaseURL function
[33m3eda97d[m Merge pull request #2 from tonypan2/tonypan/add-vercel-functions-pooling
[33m1b89656[m Update pnpm-lock.yaml with @vercel/functions dependency
[33mb2ecb2b[m Add @vercel/functions for   database connection pooling
[33mae6c502[m refactor: enhance comments in getClientBaseURL function for clarity and runtime handling
[33m3d3a065[m fix: improve baseURL logic in authClient and auth to ensure proper fallback handling
[33ma96115b[m fix: refactor baseURL logic in authClient to use getClientBaseURL function
[33m0fd297d[m fix: update baseURL logic in authClient to fallback to NEXT_PUBLIC_SITE_URL
[33ma9c4109[m refactor: update authentication handling in route and actions to improve clarity
[33m5dfb752[m fix: update Vercel deployment button link to include environment variable instructions
[33m42ec019[m fix: update README to reflect removal of GitHub OAuth and emphasize email/password authentication
[33me62cd3c[m fix: improve layout of post title and URL in PostItem component
[33m277468d[m fix: simplify submittedByName display in PostItem component
[33m48de8d5[m refactor: remove GitHub OAuth integration and update authentication to use email/password
[33m12be005[m Merge pull request #1 from WoshuaJolk/josh/pass
[33m946ad60[m push
[33mc2dfaaf[m fix: update Vercel deployment button link to include environment variable instructions
[33m588511e[m feat: implement GitHub OAuth configuration check and error handling in AuthButton and AuthForm refactor: add GitHubConfigChecker component for centralized configuration checking
[33mdc741b1[m feat: add GitHub OAuth configuration check and error handling in AuthForm
[33m404f938[m refactor: update authentication error handling and improve baseURL configuration
[33m8571773[m refactor: update background color of PostSubmissionForm for better visual consistency
[33mb73458a[m refactor: update link colors for better accessibility and consistency across components
[33mdcd1dd9[m docs: update demo link in README for accurate navigation
[33m4e0aaa6[m refactor: simplify auth handler initialization and remove redundant MongoDB options
[33m74aca93[m refactor: enhance MongoDB connection options for improved stability and security
[33m713b449[m Revert "refactor: streamline auth handling by replacing authInstance with auth variable for consistency; enhance MongoDB connection management with lazy initialization"
[33m7baef92[m refactor: streamline auth handling by replacing authInstance with auth variable for consistency; enhance MongoDB connection management with lazy initialization
[33m8f27423[m refactor: replace auth instance with getAuth function for improved lazy initialization; update package-lock.json to correct project name
[33m38d0cc1[m refactor: update package.json to correct project name and enhance description; update homepage and repository URLs
[33m70c23c7[m refactor: update README and page title for clarity; adjust demo links and footer URLs
[33m7ad27bb[m refactor: update footer links to include Better Auth and correct GitHub repository URL
[33m0da9287[m refactor: enhance PostItem component to display GitHub username and improve URL rendering; update user schema to include GitHub username
[33mdf58afb[m refactor: update metadata and descriptions in layout and page components; clean up comments in PostSection
[33m71e9c4c[m refactor: consolidate login and signup forms into a single AuthForm component
[33mc1281d8[m refactor: update component imports and fix optional className prop in AuthButton
[33mba4becf[m refactor PostItem component; move getTimeAgo function to utils and clean up code
[33mf122920[m refactor API structure; remove posts route and update data fetching method in documentation
[33mb203308[m add setup-indexes script; create MongoDB indexes for posts collection and handle existing indexes
[33m5833ac7[m refactor PostItem voting logic; streamline authentication check and improve session handling
[33m90bfb80[m refactor authentication flow; remove email/password fields, implement GitHub-only login, and enhance session handling
[33m28032bf[m refactor authentication forms; simplify login and signup to use GitHub only, removing email/password fields
[33ma3465aa[m refactor to optimize mutations and optimistic updates
[33m0ea7c88[m refactor footer layout; change footer to flex column on small screens and adjust badge class for responsiveness
[33md22db3c[m refactor button styles and footer links; streamline button class usage and update footer link structure
[33mea7d2a8[m update footer links; change "View on GitHub" to "Deploy Now" and enhance footer content with technology credits
[33m7a1ca9e[m refactor layout in Home component; adjust padding and margin for better spacing
[33m9190834[m add pagination to post listing; implement pagination UI components
[33m02ea3fe[m implement URL uniqueness check in post submission; add Toaster component for notifications
[33m5261084[m initial post submission functionality
[33m4a54ba4[m added login/logout functionality
[33maf241ba[m added better-auth base functionality
[33m32c2b79[m init
