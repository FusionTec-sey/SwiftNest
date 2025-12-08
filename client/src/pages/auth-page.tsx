import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Building2, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema, loginSchema, type InsertUser, type LoginData } from "@shared/schema";
import { ThemeToggle } from "@/components/theme-toggle";
import { z } from "zod";

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const organizationTypes = [
  "Builder",
  "Property Manager",
  "Real Estate Company",
  "Corporate",
  "Other",
];

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      accountType: "INDIVIDUAL",
      organizationName: "",
      organizationType: "",
      gstId: "",
    },
  });

  const accountType = registerForm.watch("accountType");

  if (user) {
    setLocation("/");
    return null;
  }

  const handleLogin = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const handleRegister = (data: RegisterFormData) => {
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData as InsertUser);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="grid lg:grid-cols-2 min-h-screen">
        <div className="flex items-center justify-center p-4 md:p-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary">
                  <Building2 className="h-7 w-7 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl" data-testid="text-auth-title">Welcome to SwiftNest</CardTitle>
              <CardDescription>Property management made simple</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                  <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="you@example.com" 
                                {...field} 
                                data-testid="input-login-email"
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
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Enter your password" 
                                  {...field} 
                                  data-testid="input-login-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowPassword(!showPassword)}
                                  data-testid="button-toggle-password"
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                        data-testid="button-login"
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Logging in...
                          </>
                        ) : (
                          "Login"
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="accountType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Type</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="grid grid-cols-2 gap-4"
                              >
                                <label
                                  className={`flex items-center gap-3 p-4 border rounded-md cursor-pointer transition-colors ${
                                    field.value === "INDIVIDUAL"
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover-elevate"
                                  }`}
                                  data-testid="radio-individual"
                                >
                                  <RadioGroupItem value="INDIVIDUAL" className="sr-only" />
                                  <User className={`h-5 w-5 ${field.value === "INDIVIDUAL" ? "text-primary" : "text-muted-foreground"}`} />
                                  <div>
                                    <p className="font-medium text-sm">Individual</p>
                                    <p className="text-xs text-muted-foreground">Personal use</p>
                                  </div>
                                </label>
                                <label
                                  className={`flex items-center gap-3 p-4 border rounded-md cursor-pointer transition-colors ${
                                    field.value === "ORGANIZATION"
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover-elevate"
                                  }`}
                                  data-testid="radio-organization"
                                >
                                  <RadioGroupItem value="ORGANIZATION" className="sr-only" />
                                  <Building2 className={`h-5 w-5 ${field.value === "ORGANIZATION" ? "text-primary" : "text-muted-foreground"}`} />
                                  <div>
                                    <p className="font-medium text-sm">Organization</p>
                                    <p className="text-xs text-muted-foreground">Business use</p>
                                  </div>
                                </label>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="John Doe" 
                                {...field} 
                                data-testid="input-register-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 grid-cols-2">
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email"
                                  placeholder="you@example.com" 
                                  {...field} 
                                  data-testid="input-register-email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input 
                                  type="tel"
                                  placeholder="+1 234 567 8900" 
                                  {...field} 
                                  data-testid="input-register-phone"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {accountType === "ORGANIZATION" && (
                        <div className="space-y-4 p-4 bg-muted/50 rounded-md border animate-in fade-in slide-in-from-top-2 duration-200">
                          <p className="text-sm font-medium text-muted-foreground">Organization Details</p>
                          
                          <FormField
                            control={registerForm.control}
                            name="organizationName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Organization Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Acme Properties Ltd." 
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="input-org-name"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="organizationType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Organization Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-org-type">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {organizationTypes.map((type) => (
                                      <SelectItem key={type} value={type} data-testid={`option-org-${type.toLowerCase().replace(/\s+/g, '-')}`}>
                                        {type}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="gstId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>GST / Tax ID (Optional)</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter GST or Tax ID" 
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="input-gst-id"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Create a password" 
                                  {...field} 
                                  data-testid="input-register-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
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
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Confirm your password" 
                                  {...field} 
                                  data-testid="input-register-confirm-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending}
                        data-testid="button-register"
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:flex flex-col items-center justify-center p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <div className="max-w-lg text-center">
            <div className="flex justify-center mb-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary shadow-lg">
                <Building2 className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4" data-testid="text-hero-title">
              Manage Your Properties with Ease
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              SwiftNest helps you organize and manage all your properties in one place. 
              Track units, manage tenants, and stay on top of your real estate portfolio.
            </p>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="p-4">
                <p className="text-3xl font-bold text-primary">100%</p>
                <p className="text-sm text-muted-foreground">Secure</p>
              </div>
              <div className="p-4">
                <p className="text-3xl font-bold text-primary">24/7</p>
                <p className="text-sm text-muted-foreground">Access</p>
              </div>
              <div className="p-4">
                <p className="text-3xl font-bold text-primary">Easy</p>
                <p className="text-sm text-muted-foreground">To Use</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
