"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/notifications";

const settingsSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(1, "Name is required"),
  bio: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function AccountSettingsForm() {
  const { data: session } = authClient.useSession();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      email: session?.user?.email ?? "",
      name: session?.user?.name ?? "",
      bio: "",
    },
  });

  useEffect(() => {
    if (session?.user) {
      form.reset({
        email: session.user.email ?? "",
        name: session.user.name ?? "",
        bio: "",
      });
    }
  }, [session, form]);

  const onSubmit = async (data: SettingsFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/account/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        notify.success("Settings updated successfully");
      } else {
        notify.error("Failed to update settings");
      }
    } catch (error) {
      notify.error("An error occurred while updating settings");
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user) {
    return <div className="text-center py-8">Please log in to access settings</div>;
  }

  return (
    <div className="py-8 px-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">Account Settings</h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" disabled {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea placeholder="Tell us about yourself" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
