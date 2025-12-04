"use client";

import { toast } from "sonner";

type Notify = {
  success: (message: string, opts?: Parameters<typeof toast.success>[1]) => void;
  error: (message: string, opts?: Parameters<typeof toast.error>[1]) => void;
  info: (message: string, opts?: Parameters<typeof toast.message>[1]) => void;
  // keep raw toast available for advanced use
  raw: typeof toast;
};

const notify: Notify = {
  success: (message, opts) => toast.success(message, opts),
  error: (message, opts) => toast.error(message, opts),
  info: (message, opts) => toast(message, opts),
  raw: toast,
};

export { notify };
