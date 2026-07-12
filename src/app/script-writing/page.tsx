"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUserScripts, createScript, deleteScript } from "@/lib/scriptUtils";
import { Script } from "@/types/script";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Share2, Download, FileText, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportToPDF } from "@/lib/scriptUtils";

export default function ScriptWritingDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newScriptTitle, setNewScriptTitle] = useState("");
  const [newScriptDesc, setNewScriptDesc] = useState("");
  const [newScriptWrittenBy, setNewScriptWrittenBy] = useState("");
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login?redirect=/script-writing");
      return;
    }

    if (user) {
      loadScripts();
      // Set default written by name
      if (user.displayName) setNewScriptWrittenBy(user.displayName);
      else if (user.email) setNewScriptWrittenBy(user.email.split('@')[0]);
    }
  }, [user, authLoading]);

  const handleExportPDF = async (script: Script) => {
    try {
      setIsExporting(script.id);
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
      setIsExporting(null);
    }
  };

  const loadScripts = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userScripts = await getUserScripts(user.uid);
      setScripts(userScripts);
    } catch (error) {
      console.error("Error loading scripts:", error);
      toast({
        title: "Error",
        description: "Failed to load scripts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScript = async () => {
    if (!user || !newScriptTitle.trim()) return;
    try {
      setIsCreating(true);
      const scriptId = await createScript(user.uid, user.email || "", newScriptTitle, newScriptWrittenBy, newScriptDesc);
      toast({
        title: "Success",
        description: "Script created successfully!",
      });
      router.push(`/script-writing/${scriptId}`);
    } catch (error) {
      console.error("Error creating script:", error);
      toast({
        title: "Error",
        description: "Failed to create script. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteScript = async (id: string) => {
    if (!confirm("Are you sure you want to delete this script?")) return;
    try {
      await deleteScript(id);
      setScripts(scripts.filter(s => s.id !== id));
      toast({
        title: "Deleted",
        description: "Script deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting script:", error);
      toast({
        title: "Error",
        description: "Failed to delete script.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="mb-6">
        <Link href="/">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all border-none"
          >
            <ArrowLeft className="h-4 w-4" /> Go to Home
          </Button>
        </Link>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground">My Scripts</h1>
          <p className="text-muted-foreground mt-2">Write and manage your movie scripts with ease.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
              <Plus className="h-5 w-5" /> Create New Script
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card text-card-foreground border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl">Create New Script</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Give your new screenplay a title and optional description.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="grid gap-2">
                <Label htmlFor="title" className="text-foreground">Title</Label>
                <Input 
                  id="title" 
                  placeholder="e.g. The Midnight Heist" 
                  value={newScriptTitle}
                  onChange={(e) => setNewScriptTitle(e.target.value)}
                  className="bg-background border-border text-foreground focus:ring-primary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="writtenBy" className="text-foreground">Written by</Label>
                <Input 
                  id="writtenBy" 
                  placeholder="Your Name" 
                  value={newScriptWrittenBy}
                  onChange={(e) => setNewScriptWrittenBy(e.target.value)}
                  className="bg-background border-border text-foreground focus:ring-primary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="text-foreground">Description (Optional)</Label>
                <Input 
                  id="description" 
                  placeholder="A short logline or summary..." 
                  value={newScriptDesc}
                  onChange={(e) => setNewScriptDesc(e.target.value)}
                  className="bg-background border-border text-foreground focus:ring-primary"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setNewScriptTitle("");
                  setNewScriptDesc("");
                }}
                className="border-border text-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateScript} 
                disabled={!newScriptTitle.trim() || isCreating}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {scripts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-24 bg-muted/20 border-dashed border-border">
          <FileText className="h-16 w-16 text-muted-foreground/50 mb-6" />
          <h3 className="text-2xl font-semibold text-foreground">No scripts yet</h3>
          <p className="text-muted-foreground mb-8 text-center max-w-md">
            Your creative journey starts here. Create your first script and start writing your next big movie!
          </p>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg rounded-full shadow-lg">
                <Plus className="h-5 w-5" /> Start Your First Script
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card text-card-foreground border-border">
               <DialogHeader>
                <DialogTitle className="text-2xl">Create New Script</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Give your new screenplay a title and optional description.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="grid gap-2">
                  <Label htmlFor="title" className="text-foreground">Title</Label>
                  <Input 
                    id="title" 
                    placeholder="Untitled Script" 
                    value={newScriptTitle}
                    onChange={(e) => setNewScriptTitle(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="writtenBy" className="text-foreground">Written by</Label>
                  <Input 
                    id="writtenBy" 
                    placeholder="Your Name" 
                    value={newScriptWrittenBy}
                    onChange={(e) => setNewScriptWrittenBy(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-foreground">Description (Optional)</Label>
                  <Input 
                    id="description" 
                    placeholder="A short logline or summary..." 
                    value={newScriptDesc}
                    onChange={(e) => setNewScriptDesc(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateScript} disabled={!newScriptTitle.trim() || isCreating} className="bg-primary text-primary-foreground">
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {scripts.map((script) => (
            <Card key={script.id} className="group hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-xl bg-card overflow-hidden">
              <CardHeader className="bg-muted/5 group-hover:bg-primary/5 transition-colors duration-300">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate text-xl text-foreground group-hover:text-primary transition-colors">{script.title}</CardTitle>
                    <CardDescription className="truncate text-muted-foreground mt-1">
                      {script.description || "No description provided"}
                    </CardDescription>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-xl transition-transform duration-300 group-hover:scale-110">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                   <div className="h-2 w-2 rounded-full bg-primary/40"></div>
                   Last updated: {script.updatedAt?.toDate ? script.updatedAt.toDate().toLocaleDateString() : 'Just now'}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-border pt-4 bg-muted/5 group-hover:bg-primary/5 transition-colors duration-300">
                <div className="flex gap-1">
                  <Link href={`/script-writing/${script.id}`}>
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10" title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10" 
                    title="Download PDF"
                    onClick={() => handleExportPDF(script)}
                    disabled={isExporting === script.id}
                  >
                    {isExporting === script.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                    title="Delete"
                    onClick={() => handleDeleteScript(script.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Link href={`/script-writing/${script.id}`}>
                  <Button size="sm" className="gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-none">
                    Edit Script
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
