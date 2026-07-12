
"use client";

import { cn } from '@/lib/utils';
import { CheckCircle2, ListChecks, UserCircle, FileText, Image as ImageIcon, CheckCircle } from 'lucide-react';

interface Step {
  id: number;
  name: string;
  icon: React.ElementType;
}

const steps: Step[] = [
  { id: 1, name: 'Category & Skills', icon: ListChecks },
  { id: 2, name: 'Personal Info', icon: UserCircle },
  { id: 3, name: 'Portfolio Photos', icon: ImageIcon },
  { id: 4, name: 'KYC Documents', icon: FileText },
  { id: 5, name: 'Declaration & Submit', icon: CheckCircle },
];

interface ArtistRegistrationStepperProps {
  currentStep: number; // 1-based index
  isKycEnabled?: boolean;
  isPortfolioEnabled?: boolean;
}

export default function ArtistRegistrationStepper({ currentStep, isKycEnabled = true, isPortfolioEnabled = true }: ArtistRegistrationStepperProps) {
  const filteredSteps = steps.filter(step => {
    if (step.id === 3 && !isPortfolioEnabled) return false;
    if (step.id === 4 && !isKycEnabled) return false;
    return true;
  });
  
  return (
    <nav aria-label="Progress">
      <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
        {filteredSteps.map((step, index) => {
          const displayStepNumber = index + 1;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          
          return (
            <li key={step.name} className="md:flex-1">
              {isCompleted ? (
                <div className="group flex w-full flex-col border-l-4 border-primary py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
                  <span className="text-sm font-medium text-primary transition-colors flex items-center">
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    {step.name}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Step {displayStepNumber} - Completed</span>
                </div>
              ) : isCurrent ? (
                <div
                  className="flex w-full flex-col border-l-4 border-primary py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4"
                  aria-current="step"
                >
                  <span className="text-sm font-medium text-primary flex items-center">
                    <step.icon className="mr-2 h-5 w-5 animate-pulse" />
                    {step.name}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Step {displayStepNumber} - Current</span>
                </div>
              ) : (
                <div className="group flex h-full w-full flex-col border-l-4 border-border py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
                  <span className="text-sm font-medium text-muted-foreground transition-colors flex items-center">
                    <step.icon className="mr-2 h-5 w-5" />
                    {step.name}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Step {displayStepNumber} - Upcoming</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
