"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/auth";

const FormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  remember: z.boolean().optional(),
});

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setIsLoading(true);

    try {
      const result = await login({
        email: data.email,
        password: data.password,
        remember: data.remember,
      });

      if (result.success && result.user) {
        toast.success("Authentication successful", {
          description: `Welcome back, ${result.user.name}`,
          duration: 1500,
        });

        // Aguardar cookie ser salvo e redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Redirect to dashboard
        window.location.href = "/dashboard/default";
      } else {
        toast.error("Authentication failed", {
          description: result.message || "Invalid email or password.",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Connection error", {
        description: "Unable to connect to authentication service. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#EEF1F6]">Email Address</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  autoComplete="email"
                  disabled={isLoading}
                  className="bg-[#111317] border-[#1B2030] text-[#EEF1F6] placeholder:text-[#9CA3AF] focus-visible:ring-[#00ADE8]"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[#EEF1F6]">Password</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="bg-[#111317] border-[#1B2030] text-[#EEF1F6] placeholder:text-[#9CA3AF] focus-visible:ring-[#00ADE8]"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="remember"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2">
              <FormControl>
                <Checkbox
                  id="login-remember"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                  className="size-4 border-[#1B2030] data-[state=checked]:bg-[#00ADE8] data-[state=checked]:border-[#00ADE8]"
                />
              </FormControl>
              <FormLabel htmlFor="login-remember" className="text-[#9CA3AF] text-sm font-normal cursor-pointer">
                Remember me for 30 days
              </FormLabel>
            </FormItem>
          )}
        />
        <Button 
          className="w-full bg-[#00ADE8] hover:bg-[#0096CC] text-[#0B0C0E] font-medium" 
          type="submit" 
          disabled={isLoading}
        >
          {isLoading ? "Authenticating..." : "Sign In"}
        </Button>
      </form>
    </Form>
  );
}
