"use client";

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CreditCard, CheckCircle2 } from 'lucide-react';

const steps = [
  { id: 'payment', label: 'Payment', href: '/checkout/payment', icon: CreditCard },
  { id: 'confirmation', label: 'Confirmation', href: '/checkout/thank-you', icon: CheckCircle2 },
];

interface CheckoutStepperProps {
  currentStepId: 'payment' | 'confirmation';
}

const CheckoutStepper: React.FC<CheckoutStepperProps> = ({ currentStepId }) => {
  const currentStepIndex = steps.findIndex(step => step.id === currentStepId);

  return (
    <nav aria-label="Checkout steps" className="mb-8 max-w-lg mx-auto">
      <ol className="flex items-center justify-center space-x-6 sm:space-x-12">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <li key={step.id} className="flex-1">
              <div
                className={cn(
                  "group flex flex-col items-center border-t-4 pt-2 transition-all duration-300",
                  isCurrent ? "border-primary" : isCompleted ? "border-primary/40" : "border-muted"
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 sm:h-7 sm:w-7 mb-1",
                    isCurrent ? "text-primary" : isCompleted ? "text-primary/60" : "text-muted-foreground"
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-xs sm:text-sm font-bold text-center tracking-tight",
                    isCurrent ? "text-primary" : isCompleted ? "text-primary/60" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default CheckoutStepper;
