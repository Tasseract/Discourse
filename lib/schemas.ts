import { z } from "zod";

export const PostSubmissionSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(300, "Title must be less than 300 characters")
    .trim(),
  description: z.string().max(2000).optional(),
  channelId: z.string().optional(),
  tagId: z.string().optional(),
  // Removed URL field: posts will be image/title/description based.
  // Image will be uploaded as a file in the FormData; validation of size/type
  // happens server-side in the action.
  image: z.any().optional(),
});

export const PostSchema = z.object({
  _id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  // url removed
  image: z
    .object({ filename: z.string(), contentType: z.string(), data: z.string() })
    .optional(),
  channelId: z.string().optional(),
  points: z.number().default(1),
  submittedById: z.string(),
  submittedByName: z.string(),
  submittedAt: z.date(),
  votes: z.array(z.string()).default([]),
  votesDown: z.array(z.string()).default([]),
  // Optional tag object attached for display purposes (server-side enrichment)
  tag: z
    .object({ id: z.string(), name: z.string(), color: z.string().optional(), slug: z.string().optional() })
    .optional(),
});

export type Post = z.infer<typeof PostSchema>;
export type PostSubmission = z.infer<typeof PostSubmissionSchema>;

// Common interfaces used across the application
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PostsResponse {
  posts: Post[];
  pagination: PaginationInfo;
}

export interface OptimisticVote {
  points: number;
  hasUpvoted: boolean;
  hasDownvoted: boolean;
  upCount: number;
  downCount: number;
}

export interface VoteResult {
  points: number;
  hasUpvoted: boolean;
  hasDownvoted: boolean;
}

export interface SubmitPostResult {
  success: boolean;
}

export interface User {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
}

// Roles supported by the application. Add additional roles here as needed.
// Include 'guest' for unauthenticated visitors. 'member' represents a signed-in
// user without elevated privileges.
export type role = "administrator" | "moderator" | "member" | "guest";

// Extend the User interface to include role information. When creating users
// in the database (for example during sign-up), assign a default of
// `member` unless elevated privileges are required.
export interface UserWithRole extends User {
  role: role;
}