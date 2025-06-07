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
import { Brain, MessageCircle, Users, Zap, ArrowLeft } from "lucide-react";

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
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row">
      {/* Mobile Header - Only visible on mobile */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">SlackAI</h1>
        </div>
      </div>

      {/* Auth Panel - Full width on mobile */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 md:w-1/2">
        <div className="w-full max-w-md">
          {/* Logo section - Hidden on mobile */}
          <div className="hidden md:block mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">SlackAI</h1>
            <p className="text-slate-400">Intelligent Team Communication</p>
          </div>

          <Card className="bg-slate-800 border-slate-700 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-white text-center md:text-left">
                {isLogin ? "Welcome back" : "Create your account"}
              </CardTitle>
              <CardDescription className="text-slate-400 text-center md:text-left">
                {isLogin 
                  ? "Sign in to your workspace" 
                  : "Join your team's intelligent workspace"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={isLogin ? "login" : "register"} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-700 rounded-lg p-1">
                  <TabsTrigger 
                    value="login" 
                    onClick={() => setIsLogin(true)}
                    className="rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    onClick={() => setIsLogin(false)}
                    className="rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white"
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
                            <FormLabel className="text-slate-300">Email or Username</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="bg-slate-700 border-slate-600 text-white h-12"
                                placeholder="Enter your email or username"
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
                                className="bg-slate-700 border-slate-600 text-white h-12"
                                placeholder="Enter your password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-medium"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign in"}
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
                            <FormLabel className="text-slate-300">Full Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                className="bg-slate-700 border-slate-600 text-white h-12"
                                placeholder="Your full name"
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
                                className="bg-slate-700 border-slate-600 text-white h-12"
                                placeholder="name@work-email.com"
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
                                className="bg-slate-700 border-slate-600 text-white h-12"
                                placeholder="Create a strong password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-medium"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Panel - Hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 items-center justify-center p-8">
        <div className="max-w-lg">
          <h2 className="text-4xl font-bold text-white mb-6">
            AI-Powered Team Communication
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Experience the future of workplace collaboration with intelligent chat features, 
            organizational memory, and AI-driven insights.
          </p>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">AI Organization Memory</h3>
                <p className="text-slate-300">
                  Query your organization's collective knowledge across all channels and conversations
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Smart Replies</h3>
                <p className="text-slate-300">
                  Get intelligent reply suggestions powered by AI to communicate more effectively
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Enhanced Productivity</h3>
                <p className="text-slate-300">
                  Boost your team's efficiency with AI-powered insights and automation
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}