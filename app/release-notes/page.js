"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Plus, Minus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function parseChangelog(markdown) {
  const versions = [];
  const lines = markdown.split("\n");
  let currentVersion = null;
  let currentSection = null;

  for (const line of lines) {
    const versionMatch = line.match(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})/);
    if (versionMatch) {
      currentVersion = {
        version: versionMatch[1],
        date: versionMatch[2],
        sections: [],
      };
      versions.push(currentVersion);
      currentSection = null;
      continue;
    }

    const sectionMatch = line.match(/^### (.+)/);
    if (sectionMatch && currentVersion) {
      currentSection = {
        title: sectionMatch[1],
        items: [],
      };
      currentVersion.sections.push(currentSection);
      continue;
    }

    const itemMatch = line.match(/^- (.+)/);
    if (itemMatch && currentSection) {
      currentSection.items.push(itemMatch[1]);
    }
  }

  return versions;
}

function getSectionIcon(title) {
  switch (title) {
    case "Added":
      return <Plus className="h-3.5 w-3.5" />;
    case "Removed":
      return <Minus className="h-3.5 w-3.5" />;
    case "Changed":
      return <RefreshCw className="h-3.5 w-3.5" />;
    case "Fixed":
      return <RefreshCw className="h-3.5 w-3.5" />;
    default:
      return <FileText className="h-3.5 w-3.5" />;
  }
}

function getSectionColor(title) {
  switch (title) {
    case "Added":
      return "bg-green-100 text-green-800 border-green-200";
    case "Removed":
      return "bg-red-100 text-red-800 border-red-200";
    case "Changed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Fixed":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export default function ReleaseNotesPage() {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersions, setExpandedVersions] = useState({});

  useEffect(() => {
    fetch("/api/release-notes")
      .then((res) => res.json())
      .then((data) => {
        const parsed = parseChangelog(data.content);
        setVersions(parsed);
        // Expand the latest version by default
        if (parsed.length > 0) {
          setExpandedVersions({ [parsed[0].version]: true });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleVersion = (version) => {
    setExpandedVersions((prev) => ({
      ...prev,
      [version]: !prev[version],
    }));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-muted-foreground">Loading release notes...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Release Notes</h1>
            <p className="text-muted-foreground text-sm">
              Version history and changes
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {versions.map((version, index) => (
          <Card key={version.version}>
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleVersion(version.version)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">v{version.version}</CardTitle>
                  {index === 0 && (
                    <Badge variant="default">Latest</Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(version.date + "T00:00:00").toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </CardHeader>
            {expandedVersions[version.version] && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {version.sections.map((section) => (
                    <div key={section.title}>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSectionColor(section.title)}`}
                        >
                          {getSectionIcon(section.title)}
                          {section.title}
                        </span>
                      </div>
                      <ul className="space-y-1.5 ml-1">
                        {section.items.map((item, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-muted-foreground/50 mt-1.5 shrink-0">
                              &bull;
                            </span>
                            <span>{item.replace(/`([^`]+)`/g, "$1")}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
