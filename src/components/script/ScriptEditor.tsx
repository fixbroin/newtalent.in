"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { 
  updateScript, 
  subscribeToScript, 
  getNextElementType,
  exportToPDF
} from "@/lib/scriptUtils";
import { Script, ScriptElement, ScriptElementType, ScriptSettings } from "@/types/script";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  ArrowLeft, 
  Save, 
  Download, 
  Share2, 
  Settings, 
  Plus,
  Trash2,
  ChevronDown,
  ChevronLeft,
  Type,
  Palette,
  Bold,
  MoreVertical,
  Check
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { nanoid } from "nanoid";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const ELEMENT_LABELS: Record<ScriptElementType, string> = {
  'scene-heading': 'Scene Heading',
  'action': 'Action',
  'character': 'Character',
  'parenthetical': 'Parenthetical',
  'dialogue': 'Dialogue',
  'transition': 'Transition',
  'note': 'Note'
};

const FONT_OPTIONS = [
  { label: "Courier Prime", value: "courier" },
  { label: "Helvetica", value: "helvetica" },
  { label: "Times New Roman", value: "times" },
  { label: "Roboto", value: "roboto" },
  { label: "Noto Sans", value: "noto" }
];

const COLORS = [
  { name: 'Default', value: '' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#a855f7' },
];

const HIGHLIGHTS = [
  { name: 'None', value: '' },
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Red', value: '#fecaca' },
  { name: 'Purple', value: '#e9d5ff' },
];

export function ScriptEditor({ id: propId }: { id?: string }) {
  const params = useParams();
  const id = (propId || params?.id) as string;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [colorPickerElementId, setColorPickerElementId] = useState<string | null>(null);
  const [fontSizePickerElementId, setFontSizePickerElementId] = useState<string | null>(null);
  const [mobileFullscreenElementId, setMobileFullscreenElementId] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState('100vh');
  const [viewportOffsetTop, setViewportOffsetTop] = useState(0);
  const { toast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const recalculateHeights = useCallback(() => {
    setTimeout(() => {
      Object.values(editorRefs.current).forEach(textarea => {
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      });
    }, 50);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    
    const viewport = window.visualViewport;
    const updateViewport = () => {
      setViewportHeight(`${viewport.height}px`);
      setViewportOffsetTop(viewport.offsetTop);
    };

    viewport.addEventListener('resize', updateViewport);
    viewport.addEventListener('scroll', updateViewport);
    updateViewport();

    return () => {
      viewport.removeEventListener('resize', updateViewport);
      viewport.removeEventListener('scroll', updateViewport);
    };
  }, []);

  useEffect(() => {
    if (script && !loading) {
      recalculateHeights();
    }
  }, [loading, script?.id, script?.content.length, recalculateHeights]);

  useEffect(() => {
    if (id) {
      const unsubscribe = subscribeToScript(id, (updatedScript) => {
        setScript(updatedScript);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [id]);

  const handleExportPDF = async () => {
    if (!script) return;
    try {
      setIsExporting(true);
      toast({
        title: "Generating PDF",
        description: "Please wait while we prepare your script for download...",
      });
      await exportToPDF(script);
      toast({
        title: "Success",
        description: "Your script has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const debouncedSave = useCallback((updatedContent: ScriptElement[], updatedSettings?: ScriptSettings) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    setSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const updateData: any = { content: updatedContent };
        if (updatedSettings) updateData.settings = updatedSettings;
        await updateScript(id, updateData);
        setSaving(false);
      } catch (error) {
        console.error("Auto-save error:", error);
        setSaving(false);
      }
    }, 2000);
  }, [id]);

  const handleMobileKeyboardScroll = (elementId: string) => {
    // Only apply this behavior on mobile/tablet
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;

    const textarea = editorRefs.current[elementId];
    if (!textarea) return;

    // Wait for the mobile keyboard/viewport to fully appear and slide up
    setTimeout(() => {
      textarea.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 300);
  };

  const handleElementChange = (elementId: string, updates: Partial<ScriptElement>) => {
    if (!script) return;
    const isOwner = user?.uid === script.ownerId;
    const canEdit = isOwner || (script.isPublic && script.publicPermission === 'edit') || script.collaborators.some(c => c.userId === user?.uid && c.permission === 'edit');
    
    if (!canEdit) return;

    const newContent = script.content.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    );
    setScript({ ...script, content: newContent });
    debouncedSave(newContent);
    setMobileMenuOpen(false);
    if (updates.fontSize) {
      recalculateHeights();
    }
  };

  const updateSettings = (updates: Partial<ScriptSettings>) => {
    if (!script) return;
    const newSettings = { ...(script.settings || { fontFamily: 'noto', showLabelsInPdf: true }), ...updates };
    setScript({ ...script, settings: newSettings });
    debouncedSave(script.content, newSettings);
  };

  const handleAddElement = () => {
    if (!script) return;
    const activeIndex = script.content.findIndex(el => el.id === activeElementId);
    const index = activeIndex !== -1 ? activeIndex : script.content.length - 1;
    
    const newElement: ScriptElement = {
      id: nanoid(),
      type: 'action',
      text: ''
    };
    const newContent = [...script.content];
    newContent.splice(index + 1, 0, newElement);
    setScript({ ...script, content: newContent });
    debouncedSave(newContent);

    setTimeout(() => {
      editorRefs.current[newElement.id]?.focus();
      setActiveElementId(newElement.id);
    }, 0);
    setMobileMenuOpen(false);
  };

  const handleRemoveElement = () => {
    if (!script || !activeElementId || script.content.length <= 1) return;
    const activeIndex = script.content.findIndex(el => el.id === activeElementId);
    const nextToFocus = script.content[activeIndex - 1] || script.content[activeIndex + 1];
    
    const newContent = script.content.filter(el => el.id !== activeElementId);
    setScript({ ...script, content: newContent });
    debouncedSave(newContent);
    
    if (nextToFocus) {
      setTimeout(() => {
        editorRefs.current[nextToFocus.id]?.focus();
        setActiveElementId(nextToFocus.id);
      }, 0);
    }
    setMobileMenuOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, element: ScriptElement) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const nextType = getNextElementType(element.type);
      const newElement: ScriptElement = { id: nanoid(), type: nextType, text: '' };
      const newContent = [...script!.content];
      newContent.splice(index + 1, 0, newElement);
      setScript({ ...script!, content: newContent });
      debouncedSave(newContent);
      setTimeout(() => {
        editorRefs.current[newElement.id]?.focus();
        setActiveElementId(newElement.id);
      }, 0);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const types: ScriptElementType[] = ['scene-heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition'];
      const currentIndex = types.indexOf(element.type);
      const nextIndex = e.shiftKey 
        ? (currentIndex - 1 + types.length) % types.length 
        : (currentIndex + 1) % types.length;
      handleElementChange(element.id, { type: types[nextIndex] });
    } else if (e.key === 'Backspace' && element.text === '' && script!.content.length > 1) {
      e.preventDefault();
      const prevElement = script!.content[index - 1];
      handleRemoveElement();
    }
  };

  const copyShareLink = () => {
    if (!script) return;
    const link = `${window.location.origin}/script/${script.shareId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Shareable link copied to clipboard.",
    });
  };

  if (loading || authLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="container mx-auto py-20 text-center bg-background">
        <h2 className="text-2xl font-bold text-foreground">Script not found</h2>
        <Link href="/script-writing" className="mt-4 inline-block">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isOwner = user?.uid === script.ownerId;
  const canEdit = isOwner || (script.isPublic && script.publicPermission === 'edit') || script.collaborators.some(c => c.userId === user?.uid && c.permission === 'edit');

  const getElementStyles = (element: ScriptElement) => {
    let baseStyles = "w-full resize-none overflow-hidden bg-transparent focus:outline-none p-1 transition-all duration-200 ";
    
    switch (element.type) {
      case 'scene-heading': baseStyles += 'font-bold uppercase mb-1 mt-8 '; break;
      case 'action': baseStyles += 'mb-1 '; break;
      case 'character': baseStyles += 'text-center w-[50%] mx-auto font-bold uppercase mt-4 '; break;
      case 'parenthetical': baseStyles += 'text-center w-[30%] mx-auto italic mb-1 '; break;
      case 'dialogue': baseStyles += 'text-center w-[60%] mx-auto mb-1 '; break;
      case 'transition': baseStyles += 'text-right uppercase mb-1 mt-4 '; break;
      case 'note': baseStyles += 'italic text-muted-foreground bg-muted p-2 rounded mb-1 text-sm '; break;
    }

    const inlineStyles: any = {};
    if (element.color) inlineStyles.color = element.color;
    if (element.highlight) inlineStyles.backgroundColor = element.highlight;
    if (element.fontWeight === 'bold') inlineStyles.fontWeight = 'bold';
    if (element.fontSize === 'small') inlineStyles.fontSize = '12px';
    if (element.fontSize === 'large') inlineStyles.fontSize = '18px';

    return { className: baseStyles, style: inlineStyles };
  };

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-300 relative">
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/script-writing">
              <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-sm md:text-base truncate max-w-[150px] md:max-w-[300px] text-foreground">
                {script.title}
              </h1>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                {saving ? (
                  <>
                    <Loader2 className="h-2 w-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-2 w-2" /> Saved
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 gap-1 sm:gap-2 border-primary text-primary hover:bg-primary/10 text-[10px] sm:text-xs" onClick={() => setShareDialogOpen(true)}>
              <Share2 className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden xs:inline">Share</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2 sm:px-3 gap-1 sm:gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-none text-[10px] sm:text-xs" 
              onClick={handleExportPDF}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Download className="h-3 w-3 sm:h-4 sm:w-4" />}
              <span className="hidden xs:inline">{isExporting ? 'Generating...' : 'PDF'}</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground hover:bg-muted" onClick={() => setSettingsDialogOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* DESKTOP FIXED SIDE PANEL (FAR RIGHT) */}
      {canEdit && (
        <div className="hidden xl:flex fixed right-8 top-1/2 -translate-y-1/2 flex-col gap-4 z-50 transition-all">
          <div className="bg-card border border-border p-5 rounded-[2.5rem] shadow-2xl flex flex-col gap-2 items-stretch min-w-[180px]">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 text-center">Script Tools</p>
            
            <div className="flex gap-2 mb-4 items-center">
              <Button 
                variant="default" 
                className="flex-1 h-12 rounded-2xl shadow-md gap-2 font-bold"
                onClick={handleAddElement}
              >
                <Plus className="h-5 w-5" /> Add
              </Button>
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-12 w-12 rounded-2xl shadow-md"
                onClick={handleRemoveElement}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>

            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-2 px-2">Change Type</p>
            {Object.entries(ELEMENT_LABELS).map(([type, label]) => (
              <Button 
                key={type} 
                variant={activeElementId && script.content.find(el => el.id === activeElementId)?.type === type ? "default" : "secondary"}
                size="sm"
                className={`justify-start gap-3 h-10 px-4 rounded-xl transition-all hover:translate-x-[-4px] shadow-sm ${activeElementId && script.content.find(el => el.id === activeElementId)?.type === type ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                onClick={() => activeElementId && handleElementChange(activeElementId, { type: type as ScriptElementType })}
              >
                <div className={`w-2 h-2 rounded-full ${activeElementId && script.content.find(el => el.id === activeElementId)?.type === type ? 'bg-primary-foreground' : 'bg-primary'}`}></div>
                <span className="text-[11px] font-bold uppercase truncate">{label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* MOBILE POPUP MENU (TRIGGERED FROM SIDE) */}
      {canEdit && (
        <div className="xl:hidden fixed right-0 top-1/2 -translate-y-1/2 z-50">
          <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DialogTrigger asChild>
              <Button 
                size="icon" 
                className="h-14 w-8 rounded-l-2xl rounded-r-none shadow-2xl bg-primary text-primary-foreground hover:w-10 transition-all flex items-center justify-center pl-1"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-primary text-2xl font-black uppercase tracking-tighter text-center">Script Menu</DialogTitle>
                <DialogDescription className="text-center">Manage your screenplay elements and actions.</DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 mt-8">
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="default" 
                    className="h-16 rounded-2xl font-black text-base shadow-lg gap-3"
                    onClick={handleAddElement}
                  >
                    <Plus className="h-6 w-6" /> Add
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="h-16 rounded-2xl font-black text-base shadow-lg gap-3"
                    onClick={handleRemoveElement}
                  >
                    <Trash2 className="h-6 w-6" /> Delete
                  </Button>
                </div>

                <div className="h-px bg-border my-2"></div>
                <p className="text-xs font-bold text-muted-foreground uppercase text-center mb-2">Change Block Type:</p>
                
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ELEMENT_LABELS).map(([type, label]) => (
                    <Button 
                      key={type} 
                      variant={activeElementId && script.content.find(el => el.id === activeElementId)?.type === type ? "default" : "outline"}
                      className={`h-12 text-xs font-bold rounded-xl ${activeElementId && script.content.find(el => el.id === activeElementId)?.type === type ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      onClick={() => activeElementId && handleElementChange(activeElementId, { type: type as ScriptElementType })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <main className="flex-1 overflow-y-auto bg-muted/30 py-10 px-4 flex justify-center relative">
        <div 
          className="w-full max-w-[850px] min-h-[1100px] bg-card text-card-foreground shadow-xl border p-4 sm:p-8 md:p-20 font-mono text-[14px] transition-colors duration-300"
          style={{ 
            fontFamily: 
              script.settings?.fontFamily === "courier" ? "var(--font-courier), monospace" :
              script.settings?.fontFamily === "helvetica" ? "Arial, sans-serif" :
              script.settings?.fontFamily === "times" ? "var(--font-times), serif" :
              script.settings?.fontFamily === "roboto" ? "var(--font-roboto), sans-serif" :
              "var(--font-noto), sans-serif"
          }}
        >
          <div className="mb-20 text-center">
             <h2 className="text-2xl font-bold uppercase mb-2 tracking-widest">{script.title}</h2>
             <p className="mb-4 text-muted-foreground">Written by</p>
             <p className="font-bold underline uppercase">{script.writtenBy || script.ownerEmail?.split('@')[0] || "Author"}</p>
          </div>

          <div className="space-y-4">
            {script.content.map((element, index) => {
              const styles = getElementStyles(element);
              return (
                <div key={element.id} className={`group relative rounded-md transition-all duration-200 p-2 ${activeElementId === element.id ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}>
                  
                  {/* Element Label & Styling Controls Above Text */}
                  <div className="mb-1 flex justify-between items-center text-[10px] text-muted-foreground/60">
                    <span className="uppercase tracking-tighter font-semibold">{ELEMENT_LABELS[element.type]}</span>
                    
                    {/* Styling Controls - Only visible for active element or on hover */}
                    <div className={`flex items-center gap-2 transition-opacity ${activeElementId === element.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <Button 
                        variant="ghost" size="icon" className="h-5 w-5 hover:text-primary" 
                        onClick={() => handleElementChange(element.id, { fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })}
                      >
                        <Bold className={`h-3 w-3 ${element.fontWeight === 'bold' ? 'text-primary' : ''}`} />
                      </Button>
                      
                      {isMobile ? (
                        <Button 
                          variant="ghost" size="icon" className="h-5 w-5 hover:text-primary"
                          onClick={() => setColorPickerElementId(element.id)}
                        >
                          <Palette className="h-3 w-3" />
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-primary">
                              <Palette className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel className="text-xs">Text Color</DropdownMenuLabel>
                            <div className="grid grid-cols-3 gap-1 p-2">
                              {COLORS.map(c => (
                                <button 
                                  key={c.value} 
                                  className="h-6 w-6 rounded border border-border flex items-center justify-center"
                                  style={{ backgroundColor: c.value || 'white' }}
                                  onClick={() => handleElementChange(element.id, { color: c.value })}
                                >
                                  {element.color === c.value && <Check className="h-3 w-3 text-black bg-white/50 rounded-full" />}
                                </button>
                              ))}
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs">Highlight</DropdownMenuLabel>
                            <div className="grid grid-cols-3 gap-1 p-2">
                              {HIGHLIGHTS.map(h => (
                                <button 
                                  key={h.value} 
                                  className="h-6 w-6 rounded border border-border flex items-center justify-center"
                                  style={{ backgroundColor: h.value || 'transparent' }}
                                  onClick={() => handleElementChange(element.id, { highlight: h.value })}
                                >
                                  {element.highlight === h.value && <Check className="h-3 w-3 text-black" />}
                                </button>
                              ))}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {isMobile ? (
                        <Button 
                          variant="ghost" size="icon" className="h-5 w-5 hover:text-primary"
                          onClick={() => setFontSizePickerElementId(element.id)}
                        >
                          <Type className="h-3 w-3" />
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-primary">
                              <Type className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleElementChange(element.id, { fontSize: 'small' })}>Small</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleElementChange(element.id, { fontSize: 'medium' })}>Medium</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleElementChange(element.id, { fontSize: 'large' })}>Large</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {script.content.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 hover:text-destructive text-muted-foreground/60" 
                          onClick={() => {
                            setActiveElementId(element.id);
                            handleRemoveElement();
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <textarea
                    ref={el => { editorRefs.current[element.id] = el }}
                    value={element.text}
                    onChange={(e) => handleElementChange(element.id, { text: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, index, element)}
                    onFocus={() => {
                      setActiveElementId(element.id);
                      if (isMobile) {
                        setMobileFullscreenElementId(element.id);
                        editorRefs.current[element.id]?.blur();
                      } else {
                        handleMobileKeyboardScroll(element.id);
                      }
                    }}
                    placeholder={ELEMENT_LABELS[element.type]}
                    className={styles.className}
                    style={styles.style}
                    rows={1}
                    disabled={!canEdit}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                  />
                </div>
              );
            })}
          </div>

          {canEdit && (
            <div className="mt-16 flex justify-center border-t border-dashed border-border pt-10">
               <Button 
                 variant="outline" 
                 className="gap-2 text-primary border-primary hover:bg-primary hover:text-white transition-all shadow-md px-6 py-5 rounded-full" 
                 onClick={handleAddElement}
               >
                 <Plus className="h-5 w-5" /> Add New Element
               </Button>
            </div>
          )}
        </div>
      </main>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle>Share Script</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Anyone with the link can access this script based on your settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground">Public Access</Label>
                <p className="text-xs text-muted-foreground">Make this script accessible via a link.</p>
              </div>
              <Switch 
                checked={script.isPublic} 
                onCheckedChange={(checked) => updateScript(script.id, { isPublic: checked })} 
              />
            </div>
            
            {script.isPublic && (
              <>
                <div className="grid gap-2">
                  <Label className="text-foreground">Public Permission</Label>
                  <Select 
                    value={script.publicPermission} 
                    onValueChange={(val: any) => updateScript(script.id, { publicPermission: val })}
                  >
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="Select permission" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="view">View Only</SelectItem>
                      <SelectItem value="edit">Allow Editing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={`${window.location.origin}/script/${script.shareId}`} 
                    readOnly 
                    className="bg-muted text-foreground border-border"
                  />
                  <Button onClick={copyShareLink} className="bg-primary text-primary-foreground">Copy</Button>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShareDialogOpen(false)} className="bg-primary text-primary-foreground">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle>Global Script Settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editor-writtenBy">Written by</Label>
              <Input 
                id="editor-writtenBy" 
                value={script.writtenBy || ""} 
                onChange={(e) => {
                  const val = e.target.value;
                  setScript({ ...script, writtenBy: val });
                  // We can use a dedicated update function or the existing updateScript
                  updateScript(script.id, { writtenBy: val });
                }}
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="grid gap-2">
              <Label>Primary Font Family</Label>
              <Select 
                value={script.settings?.fontFamily || 'courier'} 
                onValueChange={(val: any) => updateSettings({ fontFamily: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map(font => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic">Note: Custom fonts are emulated in PDF using standard families for maximum compatibility.</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Element Labels in PDF</Label>
                <p className="text-xs text-muted-foreground">Adds small labels like "ACTION" or "CHARACTER" to the PDF.</p>
              </div>
              <Switch 
                checked={script.settings?.showLabelsInPdf} 
                onCheckedChange={(checked) => updateSettings({ showLabelsInPdf: checked })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSettingsDialogOpen(false)} className="bg-primary text-primary-foreground">Save & Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Color Picker Dialog */}
      <Dialog open={!!colorPickerElementId} onOpenChange={(open) => !open && setColorPickerElementId(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-[2rem] p-6 border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary text-lg font-bold uppercase tracking-wider text-center">Text Styling</DialogTitle>
          </DialogHeader>
          {colorPickerElementId && (() => {
            const el = script.content.find(e => e.id === colorPickerElementId);
            return (
              <div className="grid gap-6 mt-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase text-center">Text Color</p>
                  <div className="grid grid-cols-6 gap-2 justify-items-center">
                    {COLORS.map(c => (
                      <button 
                        key={c.value} 
                        className="h-8 w-8 rounded-full border border-border flex items-center justify-center shadow-sm relative"
                        style={{ backgroundColor: c.value || 'white' }}
                        onClick={() => {
                          handleElementChange(colorPickerElementId, { color: c.value });
                          setColorPickerElementId(null);
                        }}
                      >
                        {el?.color === c.value && <Check className="h-4 w-4 text-black bg-white/50 rounded-full" />}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="h-px bg-border my-2"></div>
                
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase text-center">Highlight</p>
                  <div className="grid grid-cols-6 gap-2 justify-items-center">
                    {HIGHLIGHTS.map(h => (
                      <button 
                        key={h.value} 
                        className="h-8 w-8 rounded-full border border-border flex items-center justify-center shadow-sm relative"
                        style={{ backgroundColor: h.value || 'transparent' }}
                        onClick={() => {
                          handleElementChange(colorPickerElementId, { highlight: h.value });
                          setColorPickerElementId(null);
                        }}
                      >
                        {el?.highlight === h.value && <Check className="h-4 w-4 text-black" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Mobile Font Size Dialog */}
      <Dialog open={!!fontSizePickerElementId} onOpenChange={(open) => !open && setFontSizePickerElementId(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-[2rem] p-6 border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary text-lg font-bold uppercase tracking-wider text-center">Font Size</DialogTitle>
          </DialogHeader>
          {fontSizePickerElementId && (() => {
            const el = script.content.find(e => e.id === fontSizePickerElementId);
            return (
              <div className="grid gap-3 mt-4">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <Button
                    key={size}
                    variant={el?.fontSize === size ? "default" : "outline"}
                    className="h-12 text-sm font-bold rounded-xl capitalize"
                    onClick={() => {
                      handleElementChange(fontSizePickerElementId, { fontSize: size });
                      setFontSizePickerElementId(null);
                    }}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Mobile Fullscreen Editor Overlay */}
      {isMobile && mobileFullscreenElementId && (() => {
        const element = script.content.find(el => el.id === mobileFullscreenElementId);
        if (!element) return null;
        return (
          <div 
            className="fixed left-0 right-0 bg-background z-40 flex flex-col animate-in slide-in-from-bottom duration-200"
            style={{
              height: viewportHeight,
              top: `${viewportOffsetTop}px`
            }}
          >
            <header className="border-b bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 px-2 text-foreground font-bold"
                onClick={() => {
                  setMobileFullscreenElementId(null);
                  recalculateHeights();
                }}
              >
                <ChevronLeft className="h-5 w-5" /> Back
              </Button>
              <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                {ELEMENT_LABELS[element.type]}
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" 
                  onClick={() => handleElementChange(element.id, { fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })}
                >
                  <Bold className={`h-4 w-4 ${element.fontWeight === 'bold' ? 'text-primary' : ''}`} />
                </Button>
                <Button 
                  variant="ghost" size="icon" className="h-8 w-8 hover:text-primary"
                  onClick={() => setColorPickerElementId(element.id)}
                >
                  <Palette className={`h-4 w-4 ${element.color || element.highlight ? 'text-primary' : ''}`} />
                </Button>
                <Button 
                  variant="ghost" size="icon" className="h-8 w-8 hover:text-primary"
                  onClick={() => setFontSizePickerElementId(element.id)}
                >
                  <Type className={`h-4 w-4 ${element.fontSize && element.fontSize !== 'medium' ? 'text-primary' : ''}`} />
                </Button>
                {script.content.length > 1 && (
                  <Button 
                    variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      handleRemoveElement();
                      setMobileFullscreenElementId(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </header>
            <main className="flex-1 p-6 bg-background flex flex-col">
              <textarea
                autoFocus
                data-no-scroll="true"
                value={element.text}
                onChange={(e) => handleElementChange(element.id, { text: e.target.value })}
                placeholder={`Enter ${ELEMENT_LABELS[element.type]} text...`}
                className="flex-1 w-full resize-none bg-transparent focus:outline-none font-mono text-[16px] leading-relaxed"
                style={{
                  color: element.color || undefined,
                  backgroundColor: element.highlight || undefined,
                  fontWeight: element.fontWeight || undefined,
                  fontSize: element.fontSize === 'small' ? '14px' : element.fontSize === 'large' ? '20px' : '16px',
                }}
              />
            </main>
          </div>
        );
      })()}
    </div>
  );
}