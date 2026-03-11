"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();

  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();

      // 1. Sign up with Supabase Auth
      const { data: authData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              agency_name: agencyName,
            },
            // After email confirmation the user lands back here
            emailRedirectTo: `${window.location.origin}/api/auth/confirm-signup`,
          },
        });

      if (signUpError) throw signUpError;

      if (authData.session) {
        // Email confirmation is disabled — user is immediately logged in
        await createAgencyAndOwner(
          supabase,
          authData.session.user.id,
          agencyName,
          firstName,
          lastName
        );
        router.push("/dashboard");
      } else {
        // Email confirmation required
        setEmailSent(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <h1 className="text-lg font-semibold">Nessa</h1>
            </div>
            <CardTitle className="text-base font-semibold">
              Check your email
            </CardTitle>
            <CardDescription>
              We sent a confirmation link to <strong>{email}</strong>. Click it
              to finish setting up your agency.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/login" className="text-sm text-muted-foreground underline">
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-lg font-semibold">Nessa</h1>
          </div>
          <CardTitle className="text-base text-center font-semibold">
            Create your agency
          </CardTitle>
          <CardDescription className="text-center">
            Set up your homecare agency workspace
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="agencyName" className="text-sm font-medium">
                Agency Name
              </label>
              <Input
                id="agencyName"
                type="text"
                placeholder="Sunrise Home Health"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium">
                  First Name
                </label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium">
                  Last Name
                </label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Smith"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Work Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="jane@sunrisehomehealth.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating agency…" : "Create Agency"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createAgencyAndOwner(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  agencyName: string,
  firstName: string,
  lastName: string
) {
  const slug = agencyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Create agency
  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .insert({ name: agencyName, slug })
    .select()
    .single();

  if (agencyError) throw agencyError;

  const agencyId = agency.id;

  // Create agency_members row with owner role
  const { error: memberError } = await supabase
    .from("agency_members")
    .insert({
      agency_id: agencyId,
      user_id: userId,
      role: "owner",
      is_active: true,
      joined_at: new Date().toISOString(),
    });

  if (memberError) throw memberError;

  // Create the employee profile for the owner
  const { error: employeeError } = await supabase
    .from("employees")
    .insert({
      first_name: firstName,
      last_name: lastName,
      email: (await supabase.auth.getUser()).data.user?.email ?? "",
      phone: "",
      role: "admin",
      status: "active",
      start_date: new Date().toISOString().split("T")[0],
      department: "Management",
      supervisor: "",
      address: {},
      emergency_contact: {},
      pay_rate: 0,
      pay_type: "salary",
      payroll: {},
      skills: [],
      agency_id: agencyId,
      user_id: userId,
    });

  if (employeeError) throw employeeError;
}
