"use client";

import * as React from "react";
import {
  Upload,
  FileIcon,
  ImageIcon,
  CheckCircle2,
  Loader2,
} from "lucide-react";
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
import { generatePresignedUrl } from "@/services/api";
import { toast } from "sonner";
import axios from "axios";
import axiosInstance from "@/lib/axios";

interface FileInfo {
  name: string;
  size: string;
  type: string;
  file: File;
  uploadStatus?: "idle" | "loading" | "success" | "error";
}

export function FileUploadDialog() {
  const [videoFile, setVideoFile] = React.useState<FileInfo | null>(null);
  const [thumbnailFile, setThumbnailFile] = React.useState<FileInfo | null>(
    null
  );
  const [description, setDescription] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  //Add loader if want

  const handleClick = async () => {
    try {
      if (!videoFile || !thumbnailFile || !fileName || !description) {
        toast.error("Please fill in all fields and upload the required files.");
        return;
      }

      const formData = new FormData();
      formData.append("file", videoFile.file);
      formData.append("thumbnail", thumbnailFile.file);
      formData.append("title", fileName);
      formData.append("description", description);

      // Make API call
      setIsUploading(true);
      const response = await axiosInstance.post(
        "http://localhost:4000/api/videos/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const data = response.data;
      console.log("Upload response:", data);

      if (!data) {
        toast.error("Failed to upload.");
      } else {
        toast.success("Uploaded successfully.");
        setVideoFile(null);
        setThumbnailFile(null);
        setFileName("");
        setDescription("");
      }
    } catch (error) {
      console.error("Upload error:", error);
      if (axios.isAxiosError(error)) {
        toast.error(error.message || "An error occurred while uploading.");
      } else {
        toast.error("Error while uploading.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFile = async (file: File, fileType: "video" | "image") => {
    try {
      const type = file.type.split("/")[1];
      const urlData = await generatePresignedUrl(
        file?.name,
        `${fileType}/${type}`
      );
      const preSignedUrl = urlData?.presignedUrl;

      if (!preSignedUrl) {
        throw new Error(`Error generating presigned URL for ${fileType}`);
      }

      const uploadResponse = await axios.put(preSignedUrl, file, {
        headers: {
          "Content-Type": file.type,
        },
      });

      if (uploadResponse.status !== 200) {
        throw new Error(`Error uploading the ${fileType}`);
      }

      console.log(`Upload ${fileType} success:`, uploadResponse);

      return true;
    } catch (error) {
      console.error(`Upload ${fileType} error:`, error);
      return false;
    }
  };

  const onDropVideo = React.useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const updatedVideoFile: FileInfo = {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        type: file.type.split("/")[1].toUpperCase(),
        file: file,
        uploadStatus: "loading",
      };
      setVideoFile(updatedVideoFile);
      setIsUploading(true);

      const uploadSuccess = await uploadFile(file, "video");

      setVideoFile((prev) =>
        prev
          ? {
              ...prev,
              uploadStatus: uploadSuccess ? "success" : "error",
            }
          : null
      );

      if (uploadSuccess) {
        toast.success("Video uploaded successfully");
      } else {
        toast.error("Error uploading the video");
      }

      setIsUploading(false);
    }
  }, []);

  const onDropThumbnail = React.useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const updatedThumbnailFile: FileInfo = {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        type: file.type.split("/")[1].toUpperCase(),
        file: file,
        uploadStatus: "loading",
      };
      setThumbnailFile(updatedThumbnailFile);
      setIsUploading(true);

      const uploadSuccess = await uploadFile(file, "image");

      setThumbnailFile((prev) =>
        prev
          ? {
              ...prev,
              uploadStatus: uploadSuccess ? "success" : "error",
            }
          : null
      );

      if (uploadSuccess) {
        toast.success("Thumbnail uploaded successfully");
      } else {
        toast.error("Error uploading the thumbnail");
      }

      setIsUploading(false);
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

  const renderFileUploadStatus = (file: FileInfo | null) => {
    if (!file) return null;

    switch (file.uploadStatus) {
      case "loading":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <CheckCircle2 className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
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

        <div className="mt-3 space-y-2">
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
                {renderFileUploadStatus(videoFile)}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={removeVideoFile}
                  disabled={isUploading}
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
                {renderFileUploadStatus(thumbnailFile)}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={removeThumbnailFile}
                  disabled={isUploading}
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
                disabled={isUploading}
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
                disabled={isUploading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 absolute bottom-0 pb-2 right-4">
            <SheetTrigger asChild>
              <Button variant="outline" disabled={isUploading}>
                Cancel
              </Button>
            </SheetTrigger>
            <Button
              className="bg-primary"
              disabled={
                !videoFile ||
                !thumbnailFile ||
                isUploading ||
                !fileName ||
                !description
              }
              onClick={handleClick}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
