import * as React from "react";
import { cn } from "../../lib/utils";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { Separator } from "../ui/separator";
import { Footer } from "./footer";

export interface LoginScreenProps {
  appName: string;
  appDescription: string;
  appTagline: string;
  appDetailedDescription: string;
  icon: React.ReactNode;
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
  error?: string | null;
  firebaseWarning?: string | null;
  submitLabel?: string;
  loadingLabel?: string;
  className?: string;
}

function LoginScreen({
  appName,
  appDescription,
  appTagline,
  appDetailedDescription,
  icon,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  isLoading = false,
  error,
  firebaseWarning,
  submitLabel = "Open Dashboard",
  loadingLabel = "Verifying...",
  className,
}: LoginScreenProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-secondary flex flex-col items-center justify-center p-4 font-sans text-foreground relative",
        className
      )}
    >
      <div className="bg-card p-10 rounded-xl shadow-sm max-w-[480px] w-full border border-border mb-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center">
            {icon}
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-1">{appName}</h1>
          <p className="text-sm font-medium text-muted-foreground mb-4">
            {appTagline}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed px-2">
            {appDetailedDescription}
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8">
          <Separator className="flex-1" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            ADMIN ACCESS
          </span>
          <Separator className="flex-1" />
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="h-11"
          />
          <div>
            <Input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="h-11"
            />
            {error && (
              <p className="text-destructive text-xs mt-2 text-center">
                {error}
              </p>
            )}
          </div>
          <Button
            type="submit"
            variant="outline"
            size="lg"
            isLoading={isLoading}
            className="w-full"
          >
            {isLoading ? loadingLabel : submitLabel}
          </Button>
        </form>

        {firebaseWarning && (
          <Alert variant="warning" className="mt-6 text-xs" icon={null}>
            {firebaseWarning}
          </Alert>
        )}
      </div>

      <Footer appName={appName} appDescription={appDescription} />
    </div>
  );
}

export { LoginScreen };
