// PostSubmissionForm is now shown via the header popout button; remove inline wrapper
import { PostListServer } from "./PostListServer";
import { Suspense } from "react";

interface PostSectionProps {
  currentPage: number;
  channelId?: string | null;
  q?: string;
  sort?: string;
}

export function PostSection({ currentPage, channelId, q, sort }: PostSectionProps) {
  return (
      <div className="mt-8">
        <Suspense fallback={
          <div className="text-center py-8 text-gray-400">
            Loading posts...
          </div>
        }>
          <PostListServer page={currentPage} channelId={channelId} q={q} sort={sort} />
        </Suspense>
      </div>
  );
}