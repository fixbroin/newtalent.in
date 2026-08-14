
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { ArtistApplication, ArtistControlOptions } from '@/types/firestore';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, ChevronRight, Check, Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const step1CategorySkillsSchema = z.object({
  workCategoryId: z.string({ required_error: "Please select your primary work category." }),
  experienceLevelId: z.string({ required_error: "Please select your experience level." }),
  gender: z.string({ required_error: "Please select your gender." }),
  languagesSpokenIds: z.array(z.string()).min(1, "Select at least one language spoken.").max(7, "Select up to 7 languages."),
  otherLanguageText: z.string().max(50, "Language name cannot exceed 50 characters.").optional().or(z.literal('')),
}).refine((data) => {
  if (data.languagesSpokenIds.includes('other') && (!data.otherLanguageText || data.otherLanguageText.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "Please specify your other language.",
  path: ["otherLanguageText"],
});

type Step1FormData = z.infer<typeof step1CategorySkillsSchema>;

interface Step1CategorySkillsProps {
  onNext: (data: Partial<ArtistApplication>) => void;
  initialData: Partial<ArtistApplication>;
  controlOptions: ArtistControlOptions | null;
  isSaving: boolean;
}

const STORAGE_KEY = 'newtalent_reg_step1';

const GENDER_OPTIONS = [
  { id: 'Male', label: 'Male' },
  { id: 'Female', label: 'Female' },
  { id: 'Other', label: 'Other' },
];

export default function Step1CategorySkills({
  onNext,
  initialData,
  controlOptions,
  isSaving,
}: Step1CategorySkillsProps) {
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isExperienceDialogOpen, setIsExperienceDialogOpen] = useState(false);
  const [isGenderDialogOpen, setIsGenderDialogOpen] = useState(false);

  const form = useForm<Step1FormData>({
    resolver: zodResolver(step1CategorySkillsSchema),
    defaultValues: {
      workCategoryId: initialData.workCategoryId || undefined,
      experienceLevelId: initialData.experienceLevelId || undefined,
      gender: initialData.gender || undefined,
      languagesSpokenIds: initialData.languagesSpokenIds || [],
      otherLanguageText: initialData.otherLanguageText || "",
    },
  });

  const isEditMode = typeof window !== 'undefined' && 
    (window.location.search.includes('editApplicationId=') || window.location.search.includes('edit='));

  // Restore from localStorage on mount
  useEffect(() => {
    if (isEditMode) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        form.reset({ ...form.getValues(), ...parsed });
      } catch (e) {
        console.error("Step1: Error parsing saved data", e);
      }
    }
  }, [form, isEditMode]);

  // Auto-save to localStorage on change
  const watchedFields = form.watch();
  useEffect(() => {
    if (isEditMode) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchedFields));
  }, [watchedFields, isEditMode]);

  const handleSubmit = (data: Step1FormData) => {
    const category = controlOptions?.categories.find(c => c.id === data.workCategoryId);
    const experienceLevel = controlOptions?.experienceLevels.find(e => e.id === data.experienceLevelId);
    const genderLabel = GENDER_OPTIONS.find(opt => opt.id === data.gender)?.label;

    const standardLangIds = data.languagesSpokenIds.filter(id => id !== 'other');
    const languages = controlOptions?.languageOptions.filter(lang => standardLangIds.includes(lang.id)) || [];

    const labels = languages.map(l => l.label);
    if (data.languagesSpokenIds.includes('other') && data.otherLanguageText?.trim()) {
      labels.push(data.otherLanguageText.trim());
    }

    const applicationData: Partial<ArtistApplication> = {
      workCategoryId: data.workCategoryId,
      workCategoryName: category?.name,
      workCategorySlug: category?.slug, // Capture the slug for SEO URLs
      experienceLevelId: data.experienceLevelId,
      experienceLevelLabel: experienceLevel?.label,
      gender: genderLabel || data.gender,
      languagesSpokenIds: data.languagesSpokenIds,
      languagesSpokenLabels: labels,
      otherLanguageText: data.languagesSpokenIds.includes('other') ? data.otherLanguageText : undefined,
    };
    onNext(applicationData);
  };

  if (!controlOptions) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading options...</p>
        </CardContent>
      </Card>
    );
  }

  const handleInvalid = () => {
    setTimeout(() => {
      const firstErrorEl = document.querySelector('[aria-invalid="true"], .border-destructive, .text-destructive');
      if (firstErrorEl) {
        const rect = firstErrorEl.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        window.scrollTo({ top: rect.top + scrollTop - 100, behavior: 'smooth' });
        
        const inputEl = firstErrorEl.querySelector('input, textarea, select') || firstErrorEl;
        if (inputEl instanceof HTMLElement && typeof inputEl.focus === 'function') {
          inputEl.focus();
        }
      }
    }, 50);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit, handleInvalid)} className="space-y-6">
        <CardContent className="space-y-4">
          
          {/* Work Category Popup */}
          <FormField
            control={form.control}
            name="workCategoryId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Primary Work Category *</FormLabel>
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-between h-11 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isSaving}
                      >
                        <span className="truncate">
                          {field.value
                            ? controlOptions.categories.find((cat) => cat.id === field.value)?.name
                            : "Select your main category"}
                        </span>
                        <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </DialogTrigger>
                  <DialogContent className="p-0 max-w-[90vw] sm:max-w-md">
                    <DialogHeader className="p-4 border-b">
                      <DialogTitle>Select Work Category</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-72">
                      <div className="p-2 space-y-1">
                        {controlOptions.categories.map((cat) => (
                          <Button
                            key={cat.id}
                            variant="ghost"
                            className="w-full justify-between font-normal h-11 px-3"
                            onClick={() => {
                              field.onChange(cat.id);
                              setIsCategoryDialogOpen(false);
                            }}
                          >
                            <span>{cat.name}</span>
                            {field.value === cat.id && <Check className="h-4 w-4 text-primary" />}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Experience Level Popup */}
          <FormField
            control={form.control}
            name="experienceLevelId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Experience Level *</FormLabel>
                <Dialog open={isExperienceDialogOpen} onOpenChange={setIsExperienceDialogOpen}>
                  <DialogTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-between h-11 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isSaving}
                      >
                        <span className="truncate">
                          {field.value
                            ? controlOptions.experienceLevels.find((level) => level.id === field.value)?.label
                            : "Select your experience"}
                        </span>
                        <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </DialogTrigger>
                  <DialogContent className="p-0 max-w-[90vw] sm:max-w-md">
                    <DialogHeader className="p-4 border-b">
                      <DialogTitle>Select Experience Level</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-72">
                      <div className="p-2 space-y-1">
                        {controlOptions.experienceLevels.map((level) => (
                          <Button
                            key={level.id}
                            variant="ghost"
                            className="w-full justify-between font-normal h-11 px-3"
                            onClick={() => {
                              field.onChange(level.id);
                              setIsExperienceDialogOpen(false);
                            }}
                          >
                            <span>{level.label}</span>
                            {field.value === level.id && <Check className="h-4 w-4 text-primary" />}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Gender Selection Popup */}
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Gender Selection *</FormLabel>
                <Dialog open={isGenderDialogOpen} onOpenChange={setIsGenderDialogOpen}>
                  <DialogTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-between h-11 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isSaving}
                      >
                        <span className="truncate">
                          {field.value
                            ? GENDER_OPTIONS.find((opt) => opt.id === field.value)?.label
                            : "Select your gender"}
                        </span>
                        <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </DialogTrigger>
                  <DialogContent className="p-0 max-w-[90vw] sm:max-w-md">
                    <DialogHeader className="p-4 border-b">
                      <DialogTitle>Select Gender</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-48">
                      <div className="p-2 space-y-1">
                        {GENDER_OPTIONS.map((opt) => (
                          <Button
                            key={opt.id}
                            variant="ghost"
                            className="w-full justify-between font-normal h-11 px-3"
                            onClick={() => {
                              field.onChange(opt.id);
                              setIsGenderDialogOpen(false);
                            }}
                          >
                            <span>{opt.label}</span>
                            {field.value === opt.id && <Check className="h-4 w-4 text-primary" />}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel className="flex items-center"><Languages className="mr-2 h-4 w-4 text-muted-foreground"/>Languages Spoken (Select at least one) <span className="text-destructive ml-1">*</span></FormLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 border rounded-md max-h-40 overflow-y-auto">
              {controlOptions.languageOptions.map((language) => (
                <FormField key={language.id} control={form.control} name="languagesSpokenIds"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 p-1.5 rounded hover:bg-accent/50">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(language.id)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...(field.value || []), language.id])
                              : field.onChange((field.value || []).filter((id) => id !== language.id));
                          }}
                          disabled={isSaving}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">{language.label}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
              
              {/* Other Language Checkbox */}
              <FormField control={form.control} name="languagesSpokenIds"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0 p-1.5 rounded hover:bg-accent/50">
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes('other')}
                        onCheckedChange={(checked) => {
                          const newValue = checked
                            ? [...(field.value || []), 'other']
                            : (field.value || []).filter((id) => id !== 'other');
                          field.onChange(newValue);
                          if (!checked) {
                            form.setValue('otherLanguageText', ''); // Clear it if unchecked
                          }
                        }}
                        disabled={isSaving}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">Other</FormLabel>
                  </FormItem>
                )}
              />
            </div>
            
            {/* Conditional input for other language */}
            {form.watch('languagesSpokenIds')?.includes('other') && (
              <FormField
                control={form.control}
                name="otherLanguageText"
                render={({ field }) => (
                  <FormItem className="mt-3">
                    <FormLabel>Please Specify Other Language *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter language name..."
                        {...field}
                        disabled={isSaving}
                        className="bg-background border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormMessage>{form.formState.errors.languagesSpokenIds?.message}</FormMessage>
          </FormItem>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Continue
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}

