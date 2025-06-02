import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Brain, MessageCircle, Users, Zap } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      displayName: "",
      password: "",
      confirmPassword: "",
      status: "available",
      title: "",
    },
  });

  const onLogin = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterData) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left Panel - Auth Forms */}
      <div className="w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">SlackAI</h1>
            <p className="text-slate-400">Intelligent Team Communication</p>
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">
                {isLogin ? "Welcome Back" : "Create Account"}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {isLogin 
                  ? "Sign in to your workspace" 
                  : "Join your team's intelligent workspace"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={isLogin ? "login" : "register"} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                  <TabsTrigger 
                    value="login" 
                    onClick={() => setIsLogin(true)}
                    className="data-[state=active]:bg-slate-600"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    onClick={() => setIsLogin(false)}
                    className="data-[state=active]:bg-slate-600"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4 mt-6">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Username</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="bg-slate-700 border-slate-600 text-white"
                                placeholder="Enter your username"
                              />
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
                            <FormLabel className="text-slate-300">Password</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password"
                                className="bg-slate-700 border-slate-600 text-white"
                                placeholder="Enter your password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing In..." : "Sign In"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register" className="space-y-4 mt-6">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Display Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="bg-slate-700 border-slate-600 text-white"
                                placeholder="Your full name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Username</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="bg-slate-700 border-slate-600 text-white"
                                placeholder="Choose a username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Email</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="email"
                                className="bg-slate-700 border-slate-600 text-white"
                                placeholder="your@email.com"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Job Title (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ""}
                                className="bg-slate-700 border-slate-600 text-white"
                                placeholder="e.g., Product Manager"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Password</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password"
                                className="bg-slate-700 border-slate-600 text-white"
                                placeholder="Create a password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Confirm Password</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password"
                                className="bg-slate-700 border-slate-600 text-white"
                                placeholder="Confirm your password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Hero Section */}
      <div className="w-1/2 bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            AI-Powered Team Communication
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Experience the future of workplace collaboration with intelligent chat features, 
            organizational memory, and AI-driven insights.
          </p>
          
          <div className="grid grid-cols-2 gap-6 text-left">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">AI Org Memory</h3>
                <p className="text-sm text-slate-400">
                  Query your organization's knowledge across all channels
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Smart Replies</h3>
                <p className="text-sm text-slate-400">
                  AI-generated contextual reply suggestions
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Tone Analysis</h3>
                <p className="text-sm text-slate-400">
                  Real-time impact and clarity insights
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Meeting Notes</h3>
                <p className="text-sm text-slate-400">
                  Auto-generated summaries from conversations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}