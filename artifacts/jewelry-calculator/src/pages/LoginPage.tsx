import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin, useChangePassword, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { setToken, isAuthenticated } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Lock, User as UserIcon } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  const loginMutation = useLogin();
  const changePasswordMutation = useChangePassword();

  const { data: user, isLoading: isLoadingUser } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: isAuthenticated(),
      retry: false,
    }
  });

  useEffect(() => {
    if (user && !requiresPasswordChange) {
      if (user.requiresPasswordChange) {
        setRequiresPasswordChange(true);
      } else {
        setLocation(user.role === "admin" ? "/admin" : "/calculator");
      }
    }
  }, [user, setLocation, requiresPasswordChange]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setToken(data.token);
          queryClient.setQueryData(getGetMeQueryKey(), data.user);
          if (data.requiresPasswordChange) {
            setRequiresPasswordChange(true);
            passwordForm.setValue("currentPassword", values.password);
          } else {
            setLocation(data.user.role === "admin" ? "/admin" : "/calculator");
          }
        },
        onError: (error: any) => {
          toast({
            title: "Login Failed",
            description: error?.data?.error || "Invalid credentials. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  }

  function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    changePasswordMutation.mutate(
      {
        data: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }
      },
      {
        onSuccess: () => {
          toast({
            title: "Password Updated",
            description: "Your password has been changed successfully.",
          });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setRequiresPasswordChange(false);
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error?.data?.error || "Failed to change password. Please check your current password.",
            variant: "destructive",
          });
        },
      }
    );
  }

  if (isLoadingUser && isAuthenticated()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-2xl font-serif font-bold shadow-lg shadow-primary/20">
            JC
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-serif tracking-tight text-foreground">
          JewelryCalc
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Precision Pricing System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-border shadow-xl shadow-black/10">
          {!requiresPasswordChange ? (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">Sign in</CardTitle>
                <CardDescription className="text-center">
                  Enter your credentials to access the terminal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <UserIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <Input className="pl-10 bg-input/50" placeholder="admin" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <Input type="password" placeholder="••••••••" className="pl-10 bg-input/50" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full text-primary-foreground font-medium uppercase tracking-wider py-6"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Authenticate
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">Update Password</CardTitle>
                <CardDescription className="text-center text-primary font-medium">
                  Required for first-time access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Update & Continue
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
