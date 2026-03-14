"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Trash2, ImageIcon, Type } from "lucide-react";

export default function AppSettingsPage() {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState(null);
  const [appName, setAppName] = useState("Fight Club CRM");
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings/logo");
      const data = await res.json();
      setLogoUrl(data.logo_url);
      if (data.app_name) setAppName(data.app_name);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const handleSaveAppName = async () => {
    setSavingName(true);
    try {
      const res = await fetch("/api/settings/logo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_name: appName }),
      });

      if (!res.ok) {
        throw new Error("Failed to save app name");
      }

      toast({ title: "App name saved successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/settings/logo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload logo");
      }

      setLogoUrl(data.logo_url);
      toast({ title: "Logo uploaded successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const res = await fetch("/api/settings/logo", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to remove logo");
      }

      setLogoUrl(null);
      toast({ title: "Logo removed successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col">
      <Header
        title="App Settings"
        description="Configure application branding and appearance"
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Application Name
            </CardTitle>
            <CardDescription>
              Set the name displayed in the sidebar and login screen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="app-name">Name</Label>
                <Input
                  id="app-name"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Fight Club CRM"
                />
              </div>
              <Button onClick={handleSaveAppName} disabled={savingName}>
                {savingName ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Logo
            </CardTitle>
            <CardDescription>
              Upload a logo to display on the login screen and throughout the
              application. Recommended size: 256x256 pixels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Current logo"
                    className="object-contain rounded-lg max-w-[120px] max-h-[120px]"
                  />
                ) : (
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Upload New Logo</Label>
                  <p className="text-sm text-muted-foreground">
                    Accepts JPEG, PNG, GIF, WebP, or SVG. Max 5MB.
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload Logo"}
                  </Button>
                  {logoUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveLogo}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
