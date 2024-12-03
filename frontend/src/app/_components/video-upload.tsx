"use client";

import * as React from "react";
import { Upload, FileIcon, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";

interface FileInfo {
  name: string;
  size: string;
  type: string;
  file: File;
}

export function FileUploadDialog() {
  const [videoFile, setVideoFile] = React.useState<FileInfo | null>(null);
  const [thumbnailFile, setThumbnailFile] = React.useState<FileInfo | null>(
    null
  );
  const [description, setDescription] = React.useState("");
  const [fileName, setFileName] = React.useState("2023 November Summary");

  const onDropVideo = React.useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setVideoFile({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        type: file.type.split("/")[1].toUpperCase(),
        file: file,
      });
    }
  }, []);

  const onDropThumbnail = React.useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setThumbnailFile({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        type: file.type.split("/")[1].toUpperCase(),
        file: file,
      });
    }
  }, []);

  const {
    getRootProps: getVideoRootProps,
    getInputProps: getVideoInputProps,
    isDragActive: isVideoDragActive,
  } = useDropzone({
    onDrop: onDropVideo,
    accept: {
      "video/*": [".mp4", ".avi", ".mov", ".mkv"],
    },
    maxSize: 50 * 1024 * 1024, // 50 MB
    maxFiles: 1,
  });

  const {
    getRootProps: getThumbnailRootProps,
    getInputProps: getThumbnailInputProps,
    isDragActive: isThumbnailDragActive,
  } = useDropzone({
    onDrop: onDropThumbnail,
    accept: {
      "image/*": [".jpeg", ".png", ".jpg", ".gif"],
    },
    maxSize: 10 * 1024 * 1024, // 10 MB
    maxFiles: 1,
  });

  const removeVideoFile = () => {
    setVideoFile(null);
  };

  const removeThumbnailFile = () => {
    setThumbnailFile(null);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Upload Files</Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-[500px]">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Upload files</SheetTitle>
          </div>
        </SheetHeader>

        <div className="mt-3 space-y-4">
          {/* Video Upload */}

          <div className="space-y-2">
            <Label>
              Video File <span className="text-destructive">*</span>
            </Label>
            {!videoFile && (
              <div
                {...getVideoRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center space-y-4 hover:bg-accent transition-colors 
            ${isVideoDragActive ? "bg-accent" : ""}`}
              >
                <input {...getVideoInputProps()} />
                <div className="mx-auto w-12 h-8 border-2 rounded-full flex items-center justify-center">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {isVideoDragActive
                      ? "Drop the video here..."
                      : "Choose a video or drag & drop it here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    50 MB max file size, MP4, AVI, MOV, MKV
                  </p>
                </div>
              </div>
            )}

            {videoFile && (
              <div
                key={videoFile.name}
                className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
              >
                <div className="bg-background p-2 rounded-md">
                  <FileIcon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {videoFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {videoFile.size} • {videoFile.type}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={removeVideoFile}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Thumbnail <span className="text-destructive">*</span>
            </Label>
            {!thumbnailFile && (
              <div
                {...getThumbnailRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center space-y-4 hover:bg-accent transition-colors 
                ${isThumbnailDragActive ? "bg-accent" : ""}`}
              >
                <input {...getThumbnailInputProps()} />
                <div className="mx-auto w-12 h-8 border-2 rounded-full flex items-center justify-center">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {isThumbnailDragActive
                      ? "Drop the thumbnail here..."
                      : "Choose a thumbnail or drag & drop it here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    10 MB max file size, JPEG, PNG, GIF
                  </p>
                </div>
              </div>
            )}

            {/* Uploaded Thumbnail Display */}
            {thumbnailFile && (
              <div
                key={thumbnailFile.name}
                className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
              >
                <div className="bg-background p-2 rounded-md">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {thumbnailFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {thumbnailFile.size} • {thumbnailFile.type}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={removeThumbnailFile}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filename">
                File name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="filename"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] resize-none"
                placeholder="Add a description..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 absolute bottom-0 pb-2 right-4">
            <SheetTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </SheetTrigger>
            <Button
              className="bg-primary"
              disabled={!videoFile || !thumbnailFile}
            >
              Confirm
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
